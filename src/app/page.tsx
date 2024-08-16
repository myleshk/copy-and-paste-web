"use client";

import { ChangeEvent, useCallback, useEffect, useRef, useState } from "react";
import MessagesView from "@/components/messagesView";
import Message from "@/models/message";
import { generateId } from "@/utils/crypto";
import { getUFragFromSdp } from "@/utils/rtc";
import { formatLastSeenFromDate } from "@/utils/datetime";


export default function Home() {
  const [inputMessage, setInputMessage] = useState("");
  const [userId, setUserId] = useState("");
  const [otherUserId, setOtherUserId] = useState("");
  const [peerConnected, setPeerConnected] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [lastFindAttempt, setLastFindAttempt] = useState<Date>();

  const webSocketRef = useRef<WebSocket>();
  const peerConnectionRef = useRef<RTCPeerConnection>();
  const dataChannelRef = useRef<RTCDataChannel>();
  const initializedRef = useRef(false);

  const webSocketSend = useCallback((payload: { event: string; data: any }) => {
    webSocketRef.current!.send(JSON.stringify(payload));
  }, []);

  const createOffer = useCallback(() => {
    if (!peerConnectionRef.current) {
      console.log("No peer connection");
      setPeerConnected(false);
      setOtherUserId("");
      return;
    }
    setLastFindAttempt(new Date());
    peerConnectionRef.current.createOffer().then((offer) => {
      webSocketSend({
        event: "offer",
        data: offer
      });
      // set new localDescription
      peerConnectionRef.current!.setLocalDescription(offer);
    }).catch((error) => {
      console.error("Error creating an offer")
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOffer = useCallback((offer: RTCSessionDescriptionInit) => {
    if (peerConnectionRef.current!.remoteDescription
      // && peerConnectionRef.current!.sctp?.state !== 'closed'
    ) {
      console.log("Ignore incoming offer as we already has remoteDescription set", peerConnectionRef.current!.remoteDescription, peerConnectionRef.current!.sctp?.state);
      return;
    }

    peerConnectionRef.current!.setRemoteDescription(new RTCSessionDescription(offer));
    // create and send an answer to an offer
    peerConnectionRef.current!.createAnswer().then(answer => {
      peerConnectionRef.current!.setLocalDescription(answer);
      webSocketSend({
        event: "answer",
        data: answer
      });
      console.log("handleOffer: answer sent");
    }).catch(error => {
      console.error("Error creating an answer");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const handleAnswer = useCallback((answer: RTCSessionDescriptionInit) => {
    if (peerConnectionRef.current!.remoteDescription
      // && peerConnectionRef.current!.sctp?.state !== 'closed'
    ) {
      console.log("Ignore incoming answer as we already has remoteDescription set", peerConnectionRef.current!.remoteDescription);
      console.log(peerConnectionRef.current?.sctp?.state);
      return;
    }
    peerConnectionRef.current!.setRemoteDescription(new RTCSessionDescription(answer));
    console.log("handleAnswer: connection set");
  }, []);

  const handleCandidate = useCallback((candidate: RTCIceCandidateInit) => {
    if (!candidate.usernameFragment) {
      console.log("Ignore candidates without usernameFragment")
      return;
    }
    if (peerConnectionRef.current!.sctp?.state !== 'closed') {
      // continue checking uFrag from sdp
      const uFragFromSdp = getUFragFromSdp(peerConnectionRef.current!.remoteDescription?.sdp);
      if (uFragFromSdp !== candidate.usernameFragment) {
        console.log("Ignore incoming candidate of unmatched user", uFragFromSdp, candidate.usernameFragment);
        console.log(peerConnectionRef.current?.sctp?.state);
        return;
      }
    }
    peerConnectionRef.current!.addIceCandidate(new RTCIceCandidate(candidate));
    console.log(`handleCandidate: candidate ${candidate.usernameFragment} added`);
  }, []);

  const handleUserLeave = useCallback(({ userFrag }: { userFrag: string }) => {
    if (userFrag === otherUserId) {
      setPeerConnected(false);
    }

    console.log(`handleUserLeave: ${userFrag}`);
  }, [otherUserId]);

  const onMessage = useCallback((message: Message) => {
    setMessages(oldMessages => {
      // check for duplicates
      if (oldMessages.find(m => m.id === message.id)) {
        return oldMessages;
      } else {
        return [...oldMessages, message]
      }
    });
  }, []);

  const sendMessage = useCallback(async () => {
    let bodyText = inputMessage;
    let bodyFile = '';
    const message: Message = {
      id: generateId(),
      fromId: userId,
      toId: otherUserId,
      createdAt: new Date().toJSON(),
      bodyText,
      bodyFile,
    };
    dataChannelRef.current!.send(JSON.stringify(message));
    // add to local
    setMessages(oldMessages => [...oldMessages, { ...message, bodyFile: 'BODY_FILE_PLACEHOLDER' }]);
    // reset
    setInputMessage("");
  }, [inputMessage, otherUserId, userId]);

  const onMessageInputChange = useCallback((e: ChangeEvent<HTMLTextAreaElement>) => {
    setInputMessage(e.target.value);
  }, []);

  useEffect(() => {
    // init
    if (!initializedRef.current) {
      // mark initialized
      initializedRef.current = true;

      /**
       * parts that can only be run once
       */
      if (webSocketRef.current) {
        // closing before initializing again
        webSocketRef.current.onmessage = null;
        webSocketRef.current.onerror = null;
        webSocketRef.current.close(1000, "duplicate connection");
      }
      webSocketRef.current = new WebSocket(process.env.NEXT_PUBLIC_WEBSOCKET_PATH || '/ws');

      webSocketRef.current.onopen = () => {
        console.log('Connected to signaling server');

        // initialize
        peerConnectionRef.current = new RTCPeerConnection({
          iceServers: [
            {
              urls: process.env.NEXT_PUBLIC_TURN_SERVER_URL ?? "",
              username: process.env.NEXT_PUBLIC_TURN_SERVER_USERNAME,
              credential: process.env.NEXT_PUBLIC_TURN_SERVER_PASSWORD
            }
          ]
        });

        // Setup ice handling
        peerConnectionRef.current.onicecandidate = (event) => {
          const { candidate } = event;
          if (!candidate) {
            return;
          }
          const candidateJSON = candidate.toJSON();
          const usernameFragment = candidate?.usernameFragment;
          if (!usernameFragment && !candidateJSON.usernameFragment) {
            console.log("Skip candidates without usernameFragment")
            return;
          }

          if (!candidateJSON.usernameFragment) {
            // TODO: improve the fix for iOS
            candidateJSON.usernameFragment = usernameFragment;
          }

          webSocketSend({
            event: "candidate",
            data: candidateJSON
          });
        };

        // creating data channel
        dataChannelRef.current = peerConnectionRef.current.createDataChannel("dataChannel", { ordered: true });
        console.log("Created data channel");

        dataChannelRef.current.onopen = (e) => {
          console.log("Data channel open");
        };

        dataChannelRef.current.onerror = (error) => {
          console.log("Error occured on datachannel:", error);
        };

        // when we receive a message from the other peer, printing it on the console
        dataChannelRef.current.onmessage = ({ data }: { data: string }) => {
          onMessage(JSON.parse(data));
        };

        dataChannelRef.current.onclose = () => {
          console.log("data channel is closed");
          setPeerConnected(false);
        };

        peerConnectionRef.current.ondatachannel = (event) => {
          console.log("Updating data channel to #", event.channel.id)
          setUserId(getUFragFromSdp(peerConnectionRef.current!.localDescription?.sdp));
          setOtherUserId(getUFragFromSdp(peerConnectionRef.current!.remoteDescription?.sdp));
          dataChannelRef.current = event.channel;
          setPeerConnected(true);
        };
      }

      webSocketRef.current.onerror = (error) => {
        console.error('Error with websocket', error);
      };
    }

    /**
     * parts that need to be updated/overwritten
     */

    // connect
    webSocketRef.current!.onmessage = ({ data: rawData }) => {
      // parse rawData
      const { data, event } = JSON.parse(rawData);
      console.log(`Received signal message: ${event}`);
      switch (event) {
        // when somebody wants to call us
        case "offer":
          handleOffer(data);
          break;

        case "answer":
          handleAnswer(data);
          break;

        // when a remote peer sends an ice candidate to us
        case "candidate":
          handleCandidate(data);
          break;

        case "userLeave":
          handleUserLeave(data);
          break;
      }
    };
  }, [handleAnswer, handleCandidate, handleOffer, handleUserLeave, onMessage, webSocketSend]);

  return (
    <div className="container mx-auto">
      <div className="bg-white border rounded mt-8 px-4 pt-6 pb-4">

        {userId && (<div className="text-sm">{`My user Id: ${userId}`}</div>)}

        {otherUserId ?
          (
            <>
              {peerConnected ? (
                <div className="text-sm mb-2">{`Connected with user ${otherUserId}`}</div>
              ) : (
                <div className="text-sm mb-2 text-red-600">
                  <p>{`User ${otherUserId} disconnected`}.</p>
                  <p>Refresh to start a new dialog</p>
                </div>
              )}
              <MessagesView myId={userId} messages={messages} />

              <textarea
                className="min-h-20 shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                id="message"
                placeholder="Input here..."
                value={inputMessage}
                onChange={onMessageInputChange} />

              <div className="flex items-start">
                <button onClick={sendMessage} className="btn btn-blue ml-2">Send</button>
              </div>
            </>
          ) :
          (<div className="flex items-center my-2">
            <button onClick={createOffer} className="btn btn-blue">Find other user</button>
            {lastFindAttempt && (<div className="text-sm ml-2">Last attempt: {formatLastSeenFromDate(lastFindAttempt)}</div>)}
          </div>)}

      </div>
    </div>
  );
}

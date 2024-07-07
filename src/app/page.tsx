"use client";

import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Frame, Stomp } from "@stomp/stompjs";
import MessagesView from "@/components/messagesView";
import Message from "@/models/message";
import User from "@/models/user";
import { generateId } from "@/utils/crypto";
import UsersView from "@/components/usersView";
import SockJS from "sockjs-client";

const socket = new SockJS(process.env.REACT_APP_WEBSOCKET_PATH ?? 'http://localhost:8888/ws')
const stompClient = Stomp.over(socket);

export default function Home() {
  const [userId, setUserId] = useState<string | null>(null);
  const [inputMessage, setInputMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");

  const inputDisabled = useMemo(() => !userId || !selectedUserId, [selectedUserId, userId]);
  const inputButtonDisabled = useMemo(() => inputDisabled || !inputMessage, [inputDisabled, inputMessage]);
  const otherUsers = useMemo(() => users.filter(u => u.id !== userId), [userId, users])
  const me = useMemo(() => users.find(u => u.id == userId), [userId, users])

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

  const onSelectUser = useCallback((userId: string) => {
    setSelectedUserId(userId);
  }, []);

  const connect = useCallback(() => {

    stompClient.connect({}, (frame: Frame) => {
      const userId = frame.headers['user-name'];
      setUserId(userId);
      console.log(`Connected with user ID ${userId}`);

      stompClient.subscribe('/topic/user', ({ body }) => {
        const newUsers: User[] = JSON.parse(body);
        setUsers(newUsers);
      });
    });
  }, []);

  const sendMessage = useCallback(() => {
    const message: Message = {
      id: generateId(),
      fromId: userId!,
      toId: selectedUserId!,
      createdAt: new Date().toJSON(),
      body: inputMessage
    };
    stompClient.publish({
      destination: `/app/message`,
      body: JSON.stringify(message)
    });
    // add to local
    setMessages(oldMessages => [...oldMessages, message]);
    // reset
    setInputMessage("");
  }, [inputMessage, selectedUserId, userId]);

  const onMessageInputChange = useCallback((e: ChangeEvent<HTMLTextAreaElement>) => {
    setInputMessage(e.target.value);
  }, []);

  useEffect(() => {
    connect();
  }, [connect]);

  useEffect(() => {
    stompClient.onWebSocketError = (error) => {
      setUserId("");
      console.error('Error with websocket', error);
    };

    stompClient.onStompError = (frame) => {
      console.error('Broker reported error: ' + frame.headers['message']);
      console.error('Additional details: ' + frame.body);
    };

  }, [onMessage, users]);

  useEffect(() => {
    if (!userId) {
      return;
    }
    const subscription = stompClient.subscribe(`/user/queue/message`, ({ body }) => {
      onMessage(JSON.parse(body));
    });
    return function cleanup() {
      subscription.unsubscribe();
    }
  }, [onMessage, userId])

  useEffect(() => {
    if (!selectedUserId && otherUsers.length === 1) {
      // auto select the only one
      setSelectedUserId(otherUsers[0].id!)
    }
  }, [otherUsers, selectedUserId])

  return (
    <div className="container mx-auto">
      <div className="bg-white border rounded mt-8 px-4 pt-6 pb-4">

        {!userId ? (userId === null ? (
          <div>Connecting...</div>
        ) : (
          <div>
            <p>
              Connection error
            </p>
            <button className="btn btn-blue" onClick={connect}>Retry connect</button>
          </div>
        )) :
          <>
            {me && (
              <div className="mb-4 text-xs">
                <div>
                  <div>ID: {userId}</div>
                </div>
                <div>
                  <div>Name: {me.name}</div>
                </div>
              </div>
            )}
            <UsersView users={otherUsers} selectedId={selectedUserId} onSelect={onSelectUser} />

            <MessagesView selectedId={selectedUserId} myId={userId} messages={messages} users={users} />
            <div className="mt-1 mb-4 flex">
              <textarea
                disabled={inputDisabled}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                id="message"
                placeholder={inputDisabled ? "Select user to chat with" : "Input here..."}
                value={inputMessage}
                onChange={onMessageInputChange} />
              <button disabled={inputButtonDisabled} onClick={sendMessage} className={"btn btn-blue ml-1" + (inputButtonDisabled && " opacity-50 cursor-not-allowed")}>Send</button>
            </div>
          </>
        }
      </div>
    </div>
  );
}

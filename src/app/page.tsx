"use client";

import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Client } from "@stomp/stompjs";
import MessagesView from "@/components/messagesView";
import Message from "@/models/message";
import User from "@/models/user";
import { generateId } from "@/utils/crypto";
import UsersView from "@/components/usersView";
import { getOrGenerateUserId, loadUsers, saveUsers } from "@/utils/storage";

const stompClient = new Client({
  brokerURL: 'ws://localhost:8888/ws',
});

const myUserId = getOrGenerateUserId();
const initialUsers = loadUsers();

export default function Home() {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [inputMessage, setInputMessage] = useState("");
  const [inputUsername, setInputUsername] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState(initialUsers);
  const [selectedUserId, setSelectedUserId] = useState("");

  const myUser = useMemo(
    () => {
      const user = users.find(user => user.id === myUserId);
      console.log("Loaded my user:", user);
      return user;
    },
    [users]
  );

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
    stompClient.activate();
  }, []);

  const sendMessage = useCallback(() => {
    const message: Message = {
      id: generateId(),
      fromId: myUserId!,
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
  }, [inputMessage, selectedUserId]);

  const createUser = useCallback(() => {
    const user: User = {
      id: myUserId,
      name: inputUsername,
      lastSeen: new Date().toJSON(),
    }
    stompClient.publish({
      destination: "/app/join",
      body: JSON.stringify(user),
    })
  }, [inputUsername]);

  useEffect(() => {
    connect();
  }, [connect]);

  useEffect(() => {
    stompClient.onConnect = (frame) => {
      setConnected(true);
      console.log('Connected: ' + frame);

      stompClient.subscribe(`/topic/message/${myUserId}`, ({ body }) => {
        onMessage(JSON.parse(body));
      });

      stompClient.subscribe('/topic/user', ({ body }) => {
        const newUser: User = JSON.parse(body);
        if (newUser.id === myUserId) {
          console.log("New user is myself");
        } else {
          console.log("New user", newUser);
        }

        const newUsers = loadUsers().map(user => newUser.id === user.id ? newUser : user);
        if (!newUsers.find(user => user.id === newUser.id)) {
          // not existing
          newUsers.push(newUser);
        }
        setUsers(newUsers);
        saveUsers(newUsers);
      });

      // broadcast myself again
      if (myUser) {
        stompClient.publish({
          destination: "/app/join",
          body: JSON.stringify(myUser),
        })
      }
    };

    stompClient.onWebSocketError = (error) => {
      setConnected(false);
      console.error('Error with websocket', error);
    };

    stompClient.onStompError = (frame) => {
      console.error('Broker reported error: ' + frame.headers['message']);
      console.error('Additional details: ' + frame.body);
    };

  }, [inputUsername, myUser, onMessage, users]);

  const onMessageInputChange = useCallback((e: ChangeEvent<HTMLTextAreaElement>) => {
    setInputMessage(e.target.value);
  }, []);

  const onUsernameInputChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setInputUsername(e.target.value);
  }, []);

  const inputDisabled = useMemo(() => !myUser || !selectedUserId, [myUser, selectedUserId]);
  const inputButtonDisabled = useMemo(() => inputDisabled || !inputMessage, [inputDisabled, inputMessage]);

  return (
    <div className="container mx-auto">
      <div className="bg-white border rounded mt-8 px-4 pt-6 pb-4">

        {!connected ? (connected === null ? (
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
            <div className="mb-4 flex">
              {!myUser ? (
                <>
                  <input
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    id="username"
                    type="text"
                    placeholder="Input username..."
                    value={inputUsername}
                    onChange={onUsernameInputChange}
                  />
                  <button onClick={createUser} className="btn btn-blue ml-1">Save</button>
                </>
              ) : (
                <div className="text-xs">User ID: {myUser.id}</div>
              )}
            </div>
            <UsersView users={users} myId={myUserId} selectedId={selectedUserId} onSelect={onSelectUser} />

            <MessagesView selectedId={selectedUserId} myId={myUserId} messages={messages} users={users} />
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

"use client";

import Message from "@/models/message";
import User from "@/models/user";
import { formatDiffFromJson } from "@/utils/datetime";
import { useMemo } from "react";


function MyMessageView({ message }: { message: Message; }) {
    return <div key={message.id} className="py-2 px-2 bg-sky-100 hover:bg-sky-200">
        <div className="text-xs font-light cursor-default">
            <span className="font-bold">You </span>
            {formatDiffFromJson(message.createdAt)}
        </div>
        <div className="whitespace-pre-wrap">{message.body}</div>
    </div>;
}

function TheirMessageView({ message, theirName }: { message: Message; theirName: string; }) {
    return <div key={message.id} className="py-2 px-2 hover:bg-sky-200">
        <div className="text-xs font-light cursor-default">
            <span className="font-bold">{theirName} </span>
            {formatDiffFromJson(message.createdAt)}</div>
        <div className="whitespace-pre-wrap">{message.body}</div>
    </div>;
}


export default function MessagesView({ messages, selectedId, myId, users }: { messages: Message[]; selectedId: string; myId: string; users: User[] }) {

    const filteredMessages = useMemo(
        () => messages.filter(message => (message.toId === selectedId && message.fromId === myId) || (message.fromId === selectedId && message.toId === myId)),
        [messages, myId, selectedId]
    );

    const theirName = useMemo(() => users.find(user => user.id === selectedId)?.name, [selectedId, users]);

    return (
        <div>
            <div className="mb-1">Messages:</div>

            <div className="min-h-96 border rounded text-sm">
                {filteredMessages.map((message) =>
                    message.fromId === myId ?
                        <MyMessageView key={message.id} message={message} /> :
                        <TheirMessageView key={message.id} message={message} theirName={theirName ?? "?"} />
                )}
            </div>
        </div>
    );
}

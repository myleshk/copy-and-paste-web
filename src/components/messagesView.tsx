"use client";

import Message from "@/models/message";
import { formatDiffFromJson } from "@/utils/datetime";


function MyMessageView({ message }: { message: Message; }) {
    return <div key={message.id} className="py-2 px-2 bg-sky-100 hover:bg-sky-200">
        <div className="text-xs font-light cursor-default">
            <span className="font-bold">You </span>
            {formatDiffFromJson(message.createdAt)}
        </div>
        <div className="whitespace-pre-wrap">{message.bodyText}</div>
    </div>;
}

function TheirMessageView({ message, theirName }: { message: Message; theirName: string; }) {
    return <div key={message.id} className="py-2 px-2 hover:bg-sky-200">
        <div className="text-xs font-light cursor-default">
            <span className="font-bold">{theirName} </span>
            {formatDiffFromJson(message.createdAt)}</div>
        <div className="whitespace-pre-wrap">{message.bodyText}</div>
    </div>;
}


export default function MessagesView({ messages, myId }: { messages: Message[]; myId: string; }) {

    return (
        <div>
            <div className="mb-1">Messages:</div>

            <div className="min-h-96 border rounded text-sm">
                {messages.map((message) =>
                    message.fromId === myId ?
                        <MyMessageView key={message.id} message={message} /> :
                        <TheirMessageView key={message.id} message={message} theirName={message.toId ?? "?"} />
                )}
            </div>
        </div>
    );
}

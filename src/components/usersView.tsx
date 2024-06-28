"use client";

import User from "@/models/user";
import { formatFromJson } from "@/utils/datetime";
import { useMemo } from "react";


export default function UsersView(
    {
        users,
        myId,
        selectedId,
        onSelect,
    }: {
        users: User[];
        myId: string;
        selectedId: string;
        onSelect: (userId: string) => void;
    }
) {

    const myUser = useMemo(() => users.find(user => user.id === myId), [myId, users]);

    return (
        <div className="">
            <div>Users:</div>
            {users.map((user) =>
                <ul key={user.id} className="flex min-h-8" onClick={() => onSelect(selectedId === user.id ? "" : user.id)}>
                    <div className="my-auto">{selectedId === user.id ? "🟢 ":"⚪️ "}{user.name} {Boolean(user.id === myId) && "(me)"} | Last seen at {formatFromJson(user.lastSeen)}</div>
                </ul>
            )}
        </div>
    );
}

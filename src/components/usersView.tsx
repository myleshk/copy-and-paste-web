"use client";

import User from "@/models/user";
import { formatFromJson } from "@/utils/datetime";


export default function UsersView(
    {
        users,
        selectedId,
        onSelect,
    }: {
        users: User[];
        selectedId: string;
        onSelect: (userId: string) => void;
    }
) {
    return (
        <div className="">
            <div>Users:</div>
            {users.map((user) =>
                <ul key={user.id} className="flex min-h-8" onClick={() => onSelect(selectedId === user.id! ? "" : user.id!)}>
                    <div className={"my-auto px-1 py-1 mx-0 flex-1" + (selectedId === user.id?" border-l-2 border-teal-600":" bg-slate-100")}>
                        {/* {selectedId === user.id ? "🟢 " : "⚪️ "} */}
                        {user.name} | Last seen at {formatFromJson(user.lastSeen ?? "")}</div>
                </ul>
            )}
        </div>
    );
}

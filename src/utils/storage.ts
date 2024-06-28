import User from "@/models/user";
import { generateId } from "./crypto";

const MY_USER_ID = "MY_USER_ID";
const USERS = "USERS";

function getOrGenerateId(key: string) {
    const oldId = sessionStorage.getItem(key);

    if (oldId && oldId.length > 30) {
        return oldId;
    }

    const newId = generateId();
    sessionStorage.setItem(key, newId);
    return newId;
}

export function getOrGenerateUserId() {
    return getOrGenerateId(MY_USER_ID);
}

export function loadUsers(): User[] {
    try {
        const users = JSON.parse(sessionStorage.getItem(USERS) ?? "[]");
        console.log("Loaded users from storage:", users);
        return users;
    } catch (error: any) {
        console.error(error);
        return [];
    }
}

export function saveUsers(users: User[]) {
    sessionStorage.setItem(USERS, JSON.stringify(users));
}

export function getUser() {
    const users = loadUsers();
    return users.find(user => user.id === getOrGenerateUserId());
}
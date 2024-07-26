export default interface Message {
    id: string;
    toId: string;
    fromId: string;
    createdAt: string;
    bodyText: string;
    bodyFile: string;
}
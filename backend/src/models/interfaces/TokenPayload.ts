export default interface TokenPayload {
    id: string;
    role?: string;
    iat?: number;
    exp?: number;
}
import { SandboxError } from "./base";

export class SandboxOnLoadCallbackError extends SandboxError {
    constructor(message: string) {
        super(`Error in onLoad callback: ${message}`, "UNKNOWN_ERROR");
    }
}

export class SandboxOnHookCallbackError extends SandboxError {
    constructor(id: string, message: string) {
        super(`Error in onBefore/onAfter hook callback with ID ${id}: ${message}`, "UNKNOWN_ERROR");
    }
}
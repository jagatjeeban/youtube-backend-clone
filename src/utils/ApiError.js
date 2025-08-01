class ApiError extends Error {
    constructor(
        statusCode,
        message = 'Something went wrong',
        errors = [],
        errStack = ''
    ) {
        super(message);
        this.statusCode = statusCode;
        this.data = null;
        this.message = message;
        this.success = false;
        this.errors = errors;

        if (errStack) {
            this.stack = errStack;
        } else {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}

export { ApiError }
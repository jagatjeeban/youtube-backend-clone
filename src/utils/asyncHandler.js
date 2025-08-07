// const asyncHandler = (fn) => async (err, req, res, next) => {
//     try {
//         await fn(err, req, res, next);
//     } catch (error) {
//         res.status(error.code || 500);
//     }
// }

const asyncHandler = (requestHandler) => {
    return (req, res, next) => {
        Promise
            .resolve(requestHandler(req, res, next))
            .catch((error) => {
                next(error);
            });
    }
}

export { asyncHandler }
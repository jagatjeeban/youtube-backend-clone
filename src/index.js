// require('dotenv').config({ path: './env' });
import dotenv from 'dotenv';
import connectDb from './db/index.js';
import { app } from './app.js';

dotenv.config({
    path: './env'
})

connectDb()
    .then(() => {
        app.on('error', (error) => {
            console.log('ERROR: ', error);
            throw error;
        })
        app.listen(process.env.PORT || 8000, () => {
            console.log(`Server is running at port ${process.env.PORT || 8000}`);
        })
    })
    .catch(error => {
        console.log('Db connection Err', error);
    })

// const app = express();

// (async () => {
//     try {
//         await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`);
//         app.on('error', (error) => {
//             console.log('Err', error);
//             throw error;
//         });
//         app.listen(process.env.PORT, () => {
//             console.log(`App is listening on port ${process.env.PORT}`);
//         });
//     } catch (error) {
//         console.error('Db Connection Err', error);
//         throw error;
//     }
// })();

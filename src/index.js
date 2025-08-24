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
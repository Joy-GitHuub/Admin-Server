const express = require('express');
const app = express();
const { MongoClient } = require('mongodb');
const admin = require("firebase-admin");
const cors = require('cors');
require('dotenv').config();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// DoctorDB
// ayXpPj4Sa8xflGqx
// doctors-portal-firebase.json


const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);



admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.wq4ks.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;

console.log(uri);

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });


async function verifyToken(req, res, next) {

    if (req.headers.authorization?.startsWith('Bearer ')) {
        const token = req.headers.authorization.split(' ')[1];

        try {
            const decodedUser = await admin.auth().verifyIdToken(token);
            req.decodedEmail = decodedUser.email;

        }
        catch {

        }
    }


    next();
}


async function run() {

    try {
        await client.connect();
        console.log('database Connected SUccessfuly');

        const database = client.db('Doctors_Portal');
        const userCollection = database.collection('ApplicationUser');
        const userAgaiLogin = database.collection('UserLoginAgain')
        const appointmentsCollection = database.collection('appointments');

        // GET

        app.get('/appointments', async (req, res) => {
            const email = req.query.email;
            const date = new Date(req.query.date).toLocaleDateString();
            // let date = new Date()
            // date.setDate(date.getDate() = 1);
            console.log(date)
            const query = { email: email, date: date }
            // const query = { email: email }
            // console.log(query)
            const cursor = appointmentsCollection.find(query);
            const appointments = await cursor.toArray();
            res.json(appointments);
        })


        // USER POST
        app.post('/users', async (req, res) => {
            const users = req.body;
            const result = await userCollection.insertOne(users);
            res.json(result)
            console.log(result)
        });

        // USER GET
        app.get('/users/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const user = await userCollection.findOne(query);
            let isAdmin = false;
            if (user?.role === 'admin') {
                isAdmin = true;
            }
            res.json({ admin: isAdmin })
        })

        // USER PUT/UPDATE
        app.put('/users', async (req, res) => {
            const user = req.body;
            // console.log('PUT', user)
            const filter = { email: user._id };
            const options = { upsert: true };
            const updateDoc = { $set: user };
            const result = await userCollection.updateOne(filter, updateDoc, options);
            console.log(result)
            res.json(result);
        });

        // MAKE ADMIN 
        app.put('/users/admin', verifyToken, async (req, res) => {
            const user = req.body;
            // console.log('PUT', req.headers)
            const requester = req.decodedEmail;
            if (requester) {
                const requesterAccount = await userCollection.findOne({ email: requester })
                if (requesterAccount.role === 'admin') {
                    const filter = { email: user.email }
                    const updateDoc = { $set: { role: 'admin' } }
                    const result = await userCollection.updateOne(filter, updateDoc);
                    res.json(result);
                }
            }
            else {
                res.status(403).json({ message: 'You do not have acces this site' })
            }
        })

        //APPOINTMENTS POST
        app.post('/appointments', verifyToken, async (req, res) => {
            const appointment = req.body;
            // console.log(appointment);
            const result = await appointmentsCollection.insertOne(appointment);
            res.json(result)
        })


    }
    finally {
        // await client.close();
    }

}

run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Hello Doctors Portal !');
});

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`)
})

        // app.get('./users')
        // app.get('/users/:id')
        // app.post('/users')
        // app.delete('/users/:id')
        // app.put('/users/:id')
        // // users: GET
        // // users : POST
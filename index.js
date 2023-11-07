require('dotenv').config()
const express = require('express');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors({
    origin: ['http://localhost:5173'],
    credentials: true,
}));
app.use(express.json());
app.use(cookieParser());


// our middlewares
const logger = async (req, res, next) => {
    console.log(req.method, req.url);
    next();
}

const verifyJWT = async (req, res, next) => {
    const token = req?.cookies?.token;
    if (!token) {
        return res.status(401).send({ message: 'Unauthorized' })
    }
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        // error
        if (err) {
            return res.status(401).send({ message: 'Unauthorized' })
        }

        // decoded
        req.user = decoded;
        next();
    })
}

// ==================== MongoDB Code ========================
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ufrxsge.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();

        // ================ create db collection ======================
        const servicesCollection = client.db('trip-thrive').collection('services')
        const bookingCollection = client.db('trip-thrive').collection('booking')



        // auth api
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '7d' })
            res.cookie('token', token, {
                httpOnly: true,
                secure: true,
                sameSite: 'none'
            }).send({ success: true })
        })

        // clear cookie when logout
        app.post('/logout', async (req, res) => {
            res.clearCookie('token', { maxAge: 0 }).send({ success: true })
        })




        // save service in MongoDB
        app.post('/add-service', logger, verifyJWT, async (req, res) => {
            const service = req.body;
            // console.log(service);
            const result = await servicesCollection.insertOne(service);
            res.send(result);
        })

        // get all services
        app.get('/get-services', async (req, res) => {
            const query = {}
            const options = {
                sort: { _id: -1 }
            }
            const result = await servicesCollection.find(query, options).toArray();
            res.send(result);
        })

        // get services for provider
        app.get('/get-provider-services', logger, verifyJWT, async (req, res) => {
            // console.log('token owner:', req.user.email)
            // console.log('user:', req.query.providerEmail)
            if (req.user.email !== req.query.providerEmail) {
                return response
                    .status(403)
                    .send({ error: true, message: 'Forbidden Access' })
            }
            const email = req.query.providerEmail;
            const query = { providerEmail: email };
            const result = await servicesCollection.find(query).toArray();
            res.send(result);
        })


        // get single service by id
        app.get('/service-details/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await servicesCollection.findOne(query);
            res.send(result);
        })





        // save service booking in MongoDB
        app.post('/service-booking', logger, verifyJWT, async (req, res) => {
            const service = req.body;
            const result = await bookingCollection.insertOne(service);
            res.send(result);
        })









        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);
// ==================== MongoDB Code ========================


app.get('/', (req, res) => {
    res.send('My server is running...')
})

app.listen(port, () => {
    console.log('Server running on port: ', port)
})
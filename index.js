const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser')
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;

// parsers
app.use(express.json());
app.use(cookieParser())
app.use(cors({
    origin:[
      // 'http://localhost:5173',
      'https://hotelogo-client.web.app',
      'https://hotelogo-client.firebaseapp.com'
  ],
    credentials: true
}))




// console.log(process.env.DB_PASS)

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.crviidq.mongodb.net/?retryWrites=true&w=majority`;

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
    await client.connect();

    const serviceCollection = client.db('hotelogo').collection('services');
    const bookingCollection = client.db('hotelogo').collection('bookings');


    // middlewares
        //verify token and grant access
        const gateman = (req, res, next) => {
          const { token } = req.cookies
          //console.log(token);


           //if client does not send token
           if(!token){
              return res.status(401).send({message:'You are not authorized'})
          };


          // verify a token symmetric
          jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
            if(err){
                return res.status(401).send({message:'You are not authorized'})
            }
            //console.log(decoded);
            //attach decoded user so that others can get it
            req.user = decoded
            next()
        });
    }





    app.get('/api/v1/services', async (req, res) => {
      const cursor = serviceCollection.find()
      const result = await cursor.toArray()
      res.send(result)
  });

    app.get("/api/v1/services/:serviceId" , async(req , res) => {
    const id = req.params.serviceId;
    const query = { _id : new ObjectId(id)};
    const result = await serviceCollection.findOne(query);
    res.send(result);
  });


    app.post('/api/v1/user/create-booking' , async (req, res) => {
    const booking = req.body;
    const result = await bookingCollection.insertOne(booking);
    res.send(result)
  });


    // user specific bookings
    app.get('/api/v1/user/bookings',gateman, async (req, res) => {
           
    const queryEmail = req.query.email;
    const tokenEmail = req.user.email

    if(queryEmail !== tokenEmail) {
        return  res.status(403).send({message:'forbidden access'})
    }
    let query ={}
           if(queryEmail){
            query.email = queryEmail
           }

           const result = await bookingCollection.find(query).toArray()
           res.send(result)
        });


    app.delete('/api/v1/user/cancel-booking/:bookingId' , async (req, res) => {
    const id = req.params.bookingId;
    const query = { _id : new ObjectId(id)};
    const result = await bookingCollection.deleteOne(query);
    res.send(result)
  });


    app.post('/api/v1/auth/access-token', (req, res) => {
    // creating token and send to client
    const user = req.body
    const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '7d' })
    console.log(token);
    res.cookie('token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none'
  }).send({ success: true })
});




    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);




app.get('/', (req, res) => {
    res.send('hoteloGo server is running');
  });
  
  app.listen(port, () => {
    console.log(`hoteloGo server running on ${port}`);
  })
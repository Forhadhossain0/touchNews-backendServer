const express = require('express');
const app = express();
const cors = require('cors');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const port = process.env.PORT || 5000;


app.use(cors({
  origin:[
    // 'http://localhost:5173',
    // 'http://localhost:5174',
    'https://fotouch-project.web.app',
    'https://fotouch-project.firebaseapp.com'
  ],
  credentials:true
}));
app.use(express.json());
app.use(cookieParser());




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.3worizk.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});


const logger = async (req,res,next) => {
  console.log('my middle called : ', req.host,req.originalUrl);
  next();
}

const verifyToken = async(req,res,next)=> {
  const token = req?.cookies?.token;
  if(!token){
    return res.status(401).send({message : 'unauthorized accesss'});
  }
  jwt.verify(token,process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if(err){
      console.log(err);
      return res.status(401).send({message : 'unathorized token'});
    }
    console.log('the value of token : ', decoded);
    req.user = decoded;
    next();
  })
}


async function run() {
  try {
    await client.connect();
    const BlogsCollection = client.db('touchnewsDB').collection('blogs')
    const MYusers = client.db('touchnewsDB').collection('users')
    const CommentsCollection = client.db('touchnewsDB').collection('comments')
    // const WishlistCollection = client.db('touchnewsDB').collection('wishlist')



    //jwt oparetion
    app.post('/jwt' , logger,  async (req,res) => {
      const user = req.body;
      console.log('jwts :',user)
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn : '1h'});
      res.cookie('token', token, {
              httpOnly: true, secure: false ,  // sameSite: 'none' //its use will cokkie will not come in fron end so comment it 
       })
       .send({success: true});
  })
  app.post('/logout' ,   async (req,res) => {
      const user = req.body;
      console.log(user)
      res.clearCookie('token', {maxAge: 0}).send({success: true})    
  })






     // blog
    app.get('/blog', async(req,res)=>{
      const cursor = BlogsCollection.find();
      const result = await cursor.toArray(); 
      res.send(result)
     })

    app.post('/blog', async (req,res)=> {
        const newBlog = req.body;
        console.log(newBlog)
        const result = await BlogsCollection.insertOne(newBlog);
        res.send(result) 
      })

      app.get('/blog/:id', async(req,res)=>{
        const id = req.params.id;  // console.log( id , 'find')
        const query = {_id: new ObjectId(id)};
        const result = await BlogsCollection.findOne(query);
        res.send(result);
      })

      // update blog page  
      app.put('/blog/:id',async(req,res)=>{
        const id = req.params.id;
        const query = {_id: new ObjectId(id)};
        const options = {upsert : true}
        const putProduct = req.body.addUpdateDataValues;
        console.log(putProduct)
        const UpdateProduct = {
          $set:{
            photo:putProduct.image,
            brandname:putProduct.title,
            name:putProduct.category,
            type:putProduct.shortdescription,
            price:putProduct.longdescription,
            details:putProduct.currentTime,
          }
        }
        const result = await BlogsCollection.updateOne(query,UpdateProduct,options)
        res.send(result)
      })






    app.get('/users', verifyToken, async (req,res)=> {
      let query = {};
      if (req.query?.email || req.user?.emai ){ 
            query = { email: req.query.email}; 
      }
      console.log(query,'paici')
      const result = await MYusers.find(query).toArray();
        res.send(result) 
      })



   app.get('/users/:id', async(req,res)=>{
    const id = req.params.id;
    console.log( id , 'find')
    const query = {_id: (id)};
    const result = await MYusers.findOne(query);
    res.send(result);
  })

 
    app.post('/users', async (req,res)=> {
      const newUser = req.body;
      console.log(newUser)
      const result = await MYusers.insertOne(newUser);
      res.send(result) 
    })

    app.patch('/users',async(req,res)=>{
      const user = req.body
      const query = {email: user.email};
      const UpdateUser = {
        $set:{
          logInTime : user.loginTime
        }
      }
      const result = await MYusers.updateOne(query,UpdateUser)
      res.send(result)
    })


    app.delete('/users/:id', async(req,res)=>{
      const id = req.params.id;
      console.log("ID to be deleted:", id);
      const query = {_id:id};
      const result = await MYusers.deleteOne(query);
      res.send(result);
    })


    

    // comments section 
    app.get('/comments', async(req,res)=>{
      const result = await CommentsCollection.find().toArray();
      res.send(result);
    })

    app.post('/comments/:blogId', async (req, res) => {
      const { blogId } = req.params; // Retrieve the blog ID from the request parameters
      const { comment, user } = req.body;
      const newComment = {
        comment,
        user,
        blogId: new ObjectId(blogId) // Associate the comment with the specific blog post ID
      };
      const result = await CommentsCollection.insertOne(newComment);
      res.send(result);
    });
  
     app.post('/comments', async (req,res)=> {
        const newUser = req.body;
        const result = await CommentsCollection.insertOne(newUser);
        res.send(result) 
      })



      
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);



app.get('/',(req,res)=>{
    res.send('server is running')
})

app.listen(port, () =>{
  console.log("port is running or working");
})
const express = require('express')
const app = express()
const cors = require('cors')
const mySecret = process.env['MONGO_URI']
require('dotenv').config()
const bodyParser = require('body-parser')


// Database Configuration.
const mongoose = require('mongoose');
mongoose.connect(mySecret, {
  useNewUrlParser: true,
  useUnifiedTopology: true})
  .then(()=>{
  console.log("Connected with Database");
})
.catch(err=>{
  console.log("Error connecting with Database",err);
});

// Schema Configuration.

const { Schema } = mongoose;

const exerciseSchema = new Schema({
      userid: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    duration: {
        type: Number,
        required: true
    },
    date: {
        type: Date,
        default: Date.now
    }
})

const userSchema = new Schema({
  username: String,
});

// Model Configuration.

const User = mongoose.model('User', userSchema);
const Exercise = mongoose.model('Exercise', exerciseSchema);


app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

//Phase 1.1: POST and create username.
app.post('/api/users',(req,res)=>{

    //Phase 1.2: Username already exist.
     User.findOne({username:req.body.username},(err,data)=>{
      if(err){
           return res.json('Server Error')
        }
        if(data){
          return res.json('Username already taken');
        }
        else{
          //Phase 1.3: Create a new username.
          let new_user = new User({
            username: req.body.username,
          });

        new_user.save((err,data)=>{
            if(err){
              return res.json('Server Error')
              }
            //Phase 1.4 : Return an Object with username and id.
            return res.json({
              username: data.username,
              _id: data._id,
            })
          });
        }
      });
})

//Phase 2.1: GET and list of all users.
app.get('/api/users',(req,res)=>{
  User.find({},(err,data)=>{
    if(err){
       return res.json('Server Error')
    }
     return res.send(data);
  });
})

//Phase 3.1: Save Exercises Schemas.
app.use('/api/users/:_id/exercises',(req,res)=>{
  
    //Phase 3.2: Check id.
    User.findById(req.params._id,(err,user)=>{
        if(err){
          return res.status(500).json("Server Error");
        }
        if(!user){
          return res.json("Unknown userId");
        }else{
            
            let date = (req.body.date)? req.body.date : new Date().toISOString().substring(0, 10) ;
            date = new Date(date).toDateString();
          
            //Phase 3.3: Create Exercise.
            let new_exercise = new Exercise({
              userid: user._id,
              description: req.body.description,
              duration: parseInt(req.body.duration),
              date: date,
            });
          
            //Phase 3.4: Save exercise.
            new_exercise.save((err,data)=>{
              if(err){
                return res.json({message:"Server Error",err});
              }else{                
                //Phase 3.5: Response will be exercises added. 
                return res.json({
                    username: user.username,
                    description: data.description,
                    duration: data.duration,
                    date: date,
                    _id: user._id,
                })
              }
            })
        }
    });
})
//Phase 4.1: GET all exercises log.
app.get('/api/users/:_id/logs',function (req,res){

  User.findById(req.params._id,(err,user)=>{
    if(err){
      return res.json('Server Error');
    }
    if(!user){
      return res.json('User Not Found');
    }

    let from = (req.query.from) ? req.query.from : new Date(0);
    let to = (req.query.to) ? req.query.to : new Date() ;
    let limit = (req.query.limit)?parseInt(req.query.limit):0;

    Exercise.find({userid:req.params._id, 
            date: {
                $gte: from,
                $lte: to
            }},{"description":1, "duration":1, "date":1, "_id":0},(err,exercises)=>{
              if(err){
      return res.json('Server Error');
    } 
      let results = exercises.map((i) => ({
        description: i.description,
        duration: i.duration,
        date: i.date.toDateString()
      }))
      
      let count = exercises.length;
      return res.json({
        _id: user._id,
        username: user.username,
        count,
        log: results,
    });
  }).limit(limit);
  });
  
});


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})

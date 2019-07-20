//const mongoClient = require('mongodb').MongoClient;

var MongoClient = require('mongodb');
var ObjectId = require('mongodb').ObjectID;
const CONNECTION_STRING = process.env.DB; 

let mongodb;

function connect(done){
  MongoClient.connect(CONNECTION_STRING, { useNewUrlParser: true }, (err, client) => {
    if(err) {
        console.log('Database error: ' + err);
        done(err);
    } else {
        console.log('Successful database connection');
        mongodb = client.db('boards');
        done();
    }
  });
}

function get(){
    if (mongodb===null) {
      console.log('Trying to get uninitialized DB');
      return null;
    }else{
      return mongodb;
    }
}

function close(){
    mongodb.close();
}



module.exports = {
    connect,
    get,
    close
};



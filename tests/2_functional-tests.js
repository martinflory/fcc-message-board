/*
*
*
*       FILL IN EACH FUNCTIONAL TEST BELOW COMPLETELY
*       -----[Keep the tests in the same order!]-----
*       (if additional are added, keep them at the very end!)
*/

var chaiHttp = require('chai-http');
var chai = require('chai');
var assert = chai.assert;
var expect = chai.expect;
var server = require('../server');
var MDB = require('../db');
var ObjectId = require('mongodb').ObjectId;
var url = require('url')

chai.use(chaiHttp);

suite('Functional Tests', function() {
  this.timeout(5000);
  
  async function replyText(board, threadId, replyId){
    let db=MDB.get();
    let doc=await db.collection(board).aggregate([
      { $unwind: "$replies" },
      { $match: { _id: new ObjectId(threadId), 'replies._id': new ObjectId(replyId) } }, 
      { $project: { "replies.text": 1}}
    ]).toArray();
    
    if (doc[0] && doc[0].replies && doc[0].replies.text){
      return doc[0].replies.text;
    }else return null;
    
  }
  
  async function isReported(board, threadId, replyId){
    let db=MDB.get();
    let doc=await db.collection(board).aggregate([
      { $unwind: "$replies" },
      { $match: { _id: new ObjectId(threadId), 'replies._id': new ObjectId(replyId) } }, 
      { $project: { "replies.reported": 1}}
    ]).toArray();
    
    if (doc[0] && doc[0].replies && (doc[0].replies.reported==true || doc[0].replies.reported==false)){
      return doc[0].replies.reported;
    }else return null;
    
  }
  async function findThread(board, threadId){
    let db=MDB.get();
    return await db.collection(board).findOne({ _id: new ObjectId(id)});
  }
  // if you send bulkInsert it does, otherwise it just drops the collection
  async function prepDB(board, bulkInsert=null){
    let db=MDB.get();

    try{
      await db.collection(board).deleteMany({ });
      
      if (bulkInsert){
        let res = await db.collection(board).insertMany( bulkInsert );
        return res.insertedIds.length;      
      }else return 0;
             
    }catch(err){
      console.log(err);
      return 0;
    }
    
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  let id=null, id2=null, threadId=null, replyId=null;
  //let db=MDB.get();
  
  suite('API ROUTING FOR /api/threads/:board', function() {
    
    suite('POST - post a thread', function() {
    // I can POST a thread to a specific message board by passing form data text and delete_password to /api/threads/{board}.
    // (Recomend res.redirect to board page /b/{board}) Saved will be _id, text, created_on(date&time), bumped_on(date&time, 
    // starts same as created_on), reported(boolean), delete_password, & replies(array).  

      test('POST - post a thread - no redirect', function(done){
        let text="this is a new thread bla bla bla";
        chai.request(server)
            .post('/api/threads/test1')
            .query({redirect: 'false'})
            .send({ text: text, delete_password: 'veryhardpassword'})
            .end(function(err, res){
              assert.equal(res.status, 200);
              assert.notProperty(res.body, 'delete_password');
              assert.notProperty(res.body, 'reported');
              assert.property(res.body, '_id');
              id=res.body._id;
              assert.property(res.body, 'created_on');
              assert.property(res.body, 'bumped_on');
              assert.equal(res.body.created_on,res.body.bumped_on);          
                                         
              done();
         });
      });
      
      test('POST - post a thread - redirect', function(done){
        chai.request(server)
            .post('/api/threads/test1')
            .send({ text: "this is a new thread and I expect a REDIRECT!", delete_password: 'veryhardpassword'})
            .end(function(err, res){
              assert.equal(res.status, 200);
              assert.equal(url.parse(res.redirects[0]).path, '/b/test1' );
              done();
         });
      });
      
    });
    
    // I can GET an array of the most recent 10 bumped threads on the board 
    // ith only the most recent 3 replies from /api/threads/{board}. The reported and delete_passwords fields will not be sent.  
    suite('GET', function() {
    test('GET /api/threads/tests no board', function(done){
      
      chai.request(server)
          .get('/api/threads/'+ new ObjectId()) //creates random name
          .end(function(err, res){
           assert.equal(res.status, 200);
           assert.isArray(res.body);
           assert.lengthOf(res.body, 0);
         done();
       });
    });


    test('GET /api/threads/tests no threads', function(done){
      prepDB('tests', null);
      chai.request(server)
          .get('/api/threads/tests') //created b4 and without any threads
          .end(function(err, res){
           assert.equal(res.status, 200);
           assert.isArray(res.body);
           assert.lengthOf(res.body, 0);          
         done();
       });
    });
      
    // response with all threads, no repoerted or delete_passwords shown.
    test('GET /api/threads/tests fewer than 10 threads', async function(){
      let now= new Date();
      let nowPlus1= new Date();
      nowPlus1.setMinutes(nowPlus1.getMinutes() + 1);
      
      try{
      await prepDB('tests',  [
        { text: "This is a test thread 1" ,created_on: now  ,bumped_on: now, reported: false, delete_password: 'testdeletepassword1', 
           replies: [
             {_id: new ObjectId(), text: "This is a test reply", created_on: now, reported: false, delete_password: 'deletereplypassword1'},
             {_id: new ObjectId(), text: "This is a test reply 2" ,created_on: now, reported: false, delete_password: 'deletereplypassword1'},
             {_id: new ObjectId(), text: "This is a test reply 3" ,created_on: now, reported: false, delete_password: 'deletereplypassword1'},
             {_id: new ObjectId(), text: "This is a test reply 4" ,created_on: now, reported: false, delete_password: 'deletereplypassword1'},
             {_id: new ObjectId(), text: "This is a test reply 5" ,created_on: now, reported: false, delete_password: 'deletereplypassword1'},
         ]},
        { text: "This is a test thread 3" ,created_on: now  ,bumped_on: now, reported: false, delete_password: 'testdeletepassword1', 
           replies: [
             {_id: new ObjectId(), text: "This is a test reply", created_on: now, reported: false, delete_password: 'deletereplypassword1'},
             {_id: new ObjectId(), text: "This is a test reply 2" ,created_on: now, reported: false, delete_password: 'deletereplypassword1'},
             {_id: new ObjectId(), text: "This is a test reply 3" ,created_on: now, reported: false, delete_password: 'deletereplypassword1'},
             {_id: new ObjectId(), text: "This is a test reply 4" ,created_on: now, reported: false, delete_password: 'deletereplypassword1'},
             {_id: new ObjectId(), text: "This is a test reply 5" ,created_on: now, reported: false, delete_password: 'deletereplypassword1'},
         ]},
                { text: "This is a test thread 3" ,created_on: now  ,bumped_on: now, reported: false, delete_password: 'testdeletepassword1', 
           replies: [
             {_id: new ObjectId(), text: "This is a test reply", created_on: now, reported: false, delete_password: 'deletereplypassword1'},
             {_id: new ObjectId(), text: "This is a test reply 2" ,created_on: now, reported: false, delete_password: 'deletereplypassword1'},
             {_id: new ObjectId(), text: "This is a test reply 3" ,created_on: now, reported: false, delete_password: 'deletereplypassword1'},
             {_id: new ObjectId(), text: "This is a test reply 4" ,created_on: now, reported: false, delete_password: 'deletereplypassword1'},
             {_id: new ObjectId(), text: "This is a test reply 5" ,created_on: now, reported: false, delete_password: 'deletereplypassword1'},
         ]},
                { text: "This is a test thread 4" ,created_on: now ,bumped_on: now, reported: false, delete_password: 'testdeletepassword1', 
           replies: [
             {_id: new ObjectId(), text: "This is a test reply", created_on: now, reported: false, delete_password: 'deletereplypassword1'},
             {_id: new ObjectId(), text: "This is a test reply 2" ,created_on: now, reported: false, delete_password: 'deletereplypassword1'},
             {_id: new ObjectId(), text: "This is a test reply 3" ,created_on: now, reported: false, delete_password: 'deletereplypassword1'},
             {_id: new ObjectId(), text: "This is a test reply 4" ,created_on: now, reported: false, delete_password: 'deletereplypassword1'},
             {_id: new ObjectId(), text: "This is a test reply 5" ,created_on: now, reported: false, delete_password: 'deletereplypassword1'},
         ]},
                { text: "This is a test thread 5" ,created_on: now  ,bumped_on: now, reported: false, delete_password: 'testdeletepassword1', 
           replies: [
             {_id: new ObjectId(), text: "This is a test reply", created_on: now, reported: false, delete_password: 'deletereplypassword1'},
             {_id: new ObjectId(), text: "This is a test reply 2" ,created_on: now, reported: false, delete_password: 'deletereplypassword1'},
             {_id: new ObjectId(), text: "This is a test reply 3" ,created_on: now, reported: false, delete_password: 'deletereplypassword1'},
             {_id: new ObjectId(), text: "This is a test reply 4" ,created_on: now, reported: false, delete_password: 'deletereplypassword1'},
             {_id: new ObjectId(), text: "This is a test reply 5" ,created_on: now, reported: false, delete_password: 'deletereplypassword1'},
         ]},
                { text: "This is a test thread 6" ,created_on: now  ,bumped_on: now, reported: false, delete_password: 'testdeletepassword1', 
           replies: [
             {_id: new ObjectId(), text: "This is a test reply", created_on: now, reported: false, delete_password: 'deletereplypassword1'},
             {_id: new ObjectId(), text: "This is a test reply 2" ,created_on: now, reported: false, delete_password: 'deletereplypassword1'},
             {_id: new ObjectId(), text: "This is a test reply 3" ,created_on: now, reported: false, delete_password: 'deletereplypassword1'},
             {_id: new ObjectId(), text: "This is a test reply 4" ,created_on: now, reported: false, delete_password: 'deletereplypassword1'},
             {_id: new ObjectId(), text: "This is a test reply 5" ,created_on: now, reported: false, delete_password: 'deletereplypassword1'},
         ]},
                { text: "This is a test thread 7" ,created_on: now  ,bumped_on: now, reported: false, delete_password: 'testdeletepassword1', 
           replies: [
             {_id: new ObjectId(), text: "This is a test reply", created_on: now, reported: false, delete_password: 'deletereplypassword1'},
             {_id: new ObjectId(), text: "This is a test reply 2" ,created_on: now, reported: false, delete_password: 'deletereplypassword1'},
             {_id: new ObjectId(), text: "This is a test reply 3" ,created_on: now, reported: false, delete_password: 'deletereplypassword1'},
             {_id: new ObjectId(), text: "This is a test reply 4" ,created_on: now, reported: false, delete_password: 'deletereplypassword1'},
             {_id: new ObjectId(), text: "This is a test reply 5" ,created_on: now, reported: false, delete_password: 'deletereplypassword1'},
         ]},
                { text: "This is a test thread 8" ,created_on: now ,bumped_on: now, reported: false, delete_password: 'testdeletepassword1', 
           replies: [
             {_id: new ObjectId(), text: "This is a test reply", created_on: now, reported: false, delete_password: 'deletereplypassword1'},
             {_id: new ObjectId(), text: "This is a test reply 2" ,created_on: now, reported: false, delete_password: 'deletereplypassword1'},
             {_id: new ObjectId(), text: "This is a test reply 3" ,created_on: now, reported: false, delete_password: 'deletereplypassword1'},
             {_id: new ObjectId(), text: "This is a test reply 4" ,created_on: now, reported: false, delete_password: 'deletereplypassword1'},
             {_id: new ObjectId(), text: "This is a test reply 5" ,created_on: now, reported: false, delete_password: 'deletereplypassword1'},
         ]},
                { text: "This is a test thread 9" ,created_on: now  ,bumped_on: nowPlus1, reported: false, delete_password: 'testdeletepassword1', 
           replies: [
             {_id: new ObjectId(), text: "This is a test reply", created_on: now, reported: false, delete_password: 'deletereplypassword1'},
             {_id: new ObjectId(), text: "This is a test reply 2" ,created_on: now, reported: false, delete_password: 'deletereplypassword1'},
             {_id: new ObjectId(), text: "This is a test reply 3" ,created_on: now, reported: false, delete_password: 'deletereplypassword1'},
             {_id: new ObjectId(), text: "This is a test reply 4" ,created_on: now, reported: false, delete_password: 'deletereplypassword1'},
             {_id: new ObjectId(), text: "This is a test reply 5" ,created_on: nowPlus1, reported: false, delete_password: 'deletereplypassword1'},
         ]}
     ]);
      
      chai.request(server)
          .get('/api/threads/tests')
          .end(function(err, res){
            assert.equal(res.status, 200);
            assert.isArray(res.body);
            // assert.lengthOf(res.body, 9); 
            assert.notProperty(res.body[0], 'delete_password');
            assert.notProperty(res.body[0], 'reported');
            assert.property(res.body[0], '_id');
            assert.property(res.body[0], 'created_on');
            assert.property(res.body[0], 'bumped_on');
            assert.propertyVal(res.body[0], 'text','This is a test thread 9');
          });
      } catch (err){
        console.log(err);
      }
    });
    
    //respond with 10 most recently bumped threads, no reported or passwords
    //having threads with more than 3, some with fewer and some with 3. 
    test('GET /api/threads/tests more than 10 threads', async function(){
    // only shows the 
      //the last one has 5 comments
      //the 2nd to last has 3 comments
      //the 3th to last has 2 comments
      let now= new Date();
      let nowPlus1= new Date();
      let nowPlus2= new Date();
      let nowPlus3= new Date();
      nowPlus1.setMinutes(nowPlus1.getMinutes() + 1);
      nowPlus2.setMinutes(nowPlus2.getMinutes() + 2);
      nowPlus3.setMinutes(nowPlus3.getMinutes() + 3);
      
      await prepDB('tests',  [
        { text: "This is a test thread 1" ,created_on: now  ,bumped_on: now, reported: false, delete_password: 'testdeletepassword1', 
           replies: [
             {_id: new ObjectId(), text: "This is a test reply", created_on: now, reported: false, delete_password: 'deletereplypassword1'},
             {_id: new ObjectId(), text: "This is a test reply 2" ,created_on: now, reported: false, delete_password: 'deletereplypassword1'},
             {_id: new ObjectId(), text: "This is a test reply 3" ,created_on: now, reported: false, delete_password: 'deletereplypassword1'},
             {_id: new ObjectId(), text: "This is a test reply 4" ,created_on: now, reported: false, delete_password: 'deletereplypassword1'},
             {_id: new ObjectId(), text: "This is a test reply 5" ,created_on: now, reported: false, delete_password: 'deletereplypassword1'},
         ]},
        { text: "This is a test thread 2" ,created_on: now  ,bumped_on: nowPlus3, reported: false, delete_password: 'testdeletepassword2', 
           replies: [
             {_id: new ObjectId(), text: "This is a test reply", created_on: now, reported: false, delete_password: 'deletereplypassword1'},
             {_id: new ObjectId(), text: "This is a test reply 2" ,created_on: now, reported: false, delete_password: 'deletereplypassword1'},
             {_id: new ObjectId(), text: "This is a test reply 3" ,created_on: nowPlus1, reported: false, delete_password: 'deletereplypassword1'},
             {_id: new ObjectId(), text: "This is a test reply 4" ,created_on: nowPlus2, reported: false, delete_password: 'deletereplypassword1'},
             {_id: new ObjectId(), text: "This is a test reply 5" ,created_on: nowPlus3, reported: false, delete_password: 'deletereplypassword1'},
         ]},
        { text: "This is a test thread 3" ,created_on: now  ,bumped_on: now, reported: false, delete_password: 'testdeletepassword1', 
           replies: [
             {_id: new ObjectId(), text: "This is a test reply", created_on: now, reported: false, delete_password: 'deletereplypassword1'},
             {_id: new ObjectId(), text: "This is a test reply 2" ,created_on: now, reported: false, delete_password: 'deletereplypassword1'},
             {_id: new ObjectId(), text: "This is a test reply 3" ,created_on: now, reported: false, delete_password: 'deletereplypassword1'},
             {_id: new ObjectId(), text: "This is a test reply 4" ,created_on: now, reported: false, delete_password: 'deletereplypassword1'},
             {_id: new ObjectId(), text: "This is a test reply 5" ,created_on: now, reported: false, delete_password: 'deletereplypassword1'},
         ]},
                { text: "This is a test thread 4" ,created_on: now ,bumped_on: now, reported: false, delete_password: 'testdeletepassword1', 
           replies: [
             {_id: new ObjectId(), text: "This is a test reply", created_on: now, reported: false, delete_password: 'deletereplypassword1'},
             {_id: new ObjectId(), text: "This is a test reply 2" ,created_on: now, reported: false, delete_password: 'deletereplypassword1'},
             {_id: new ObjectId(), text: "This is a test reply 3" ,created_on: now, reported: false, delete_password: 'deletereplypassword1'},
             {_id: new ObjectId(), text: "This is a test reply 4" ,created_on: now, reported: false, delete_password: 'deletereplypassword1'},
             {_id: new ObjectId(), text: "This is a test reply 5" ,created_on: now, reported: false, delete_password: 'deletereplypassword1'},
         ]},
                { text: "This is a test thread 5" ,created_on: now  ,bumped_on: now, reported: false, delete_password: 'testdeletepassword1', 
           replies: [
             {_id: new ObjectId(), text: "This is a test reply", created_on: now, reported: false, delete_password: 'deletereplypassword1'},
             {_id: new ObjectId(), text: "This is a test reply 2" ,created_on: now, reported: false, delete_password: 'deletereplypassword1'},
             {_id: new ObjectId(), text: "This is a test reply 3" ,created_on: now, reported: false, delete_password: 'deletereplypassword1'},
             {_id: new ObjectId(), text: "This is a test reply 4" ,created_on: now, reported: false, delete_password: 'deletereplypassword1'},
             {_id: new ObjectId(), text: "This is a test reply 5" ,created_on: now, reported: false, delete_password: 'deletereplypassword1'},
         ]},
                { text: "This is a test thread 6" ,created_on: now  ,bumped_on: now, reported: false, delete_password: 'testdeletepassword1', 
           replies: [
             {_id: new ObjectId(), text: "This is a test reply", created_on: now, reported: false, delete_password: 'deletereplypassword1'},
             {_id: new ObjectId(), text: "This is a test reply 2" ,created_on: now, reported: false, delete_password: 'deletereplypassword1'},
             {_id: new ObjectId(), text: "This is a test reply 3" ,created_on: now, reported: false, delete_password: 'deletereplypassword1'},
             {_id: new ObjectId(), text: "This is a test reply 4" ,created_on: now, reported: false, delete_password: 'deletereplypassword1'},
             {_id: new ObjectId(), text: "This is a test reply 5" ,created_on: now, reported: false, delete_password: 'deletereplypassword1'},
         ]},
                { text: "This is a test thread 7" ,created_on: now  ,bumped_on: now, reported: false, delete_password: 'testdeletepassword1', 
           replies: [
             {_id: new ObjectId(), text: "This is a test reply", created_on: now, reported: false, delete_password: 'deletereplypassword1'},
             {_id: new ObjectId(), text: "This is a test reply 2" ,created_on: now, reported: false, delete_password: 'deletereplypassword1'},
             {_id: new ObjectId(), text: "This is a test reply 3" ,created_on: now, reported: false, delete_password: 'deletereplypassword1'},
             {_id: new ObjectId(), text: "This is a test reply 4" ,created_on: now, reported: false, delete_password: 'deletereplypassword1'},
             {_id: new ObjectId(), text: "This is a test reply 5" ,created_on: now, reported: false, delete_password: 'deletereplypassword1'},
         ]},
                { text: "This is a test thread 8" ,created_on: now ,bumped_on: now, reported: false, delete_password: 'testdeletepassword1', 
           replies: [
             {_id: new ObjectId(), text: "This is a test reply", created_on: now, reported: false, delete_password: 'deletereplypassword1'},
             {_id: new ObjectId(), text: "This is a test reply 2" ,created_on: now, reported: false, delete_password: 'deletereplypassword1'},
             {_id: new ObjectId(), text: "This is a test reply 3" ,created_on: now, reported: false, delete_password: 'deletereplypassword1'},
             {_id: new ObjectId(), text: "This is a test reply 4" ,created_on: now, reported: false, delete_password: 'deletereplypassword1'},
             {_id: new ObjectId(), text: "This is a test reply 5" ,created_on: now, reported: false, delete_password: 'deletereplypassword1'},
         ]},
          { text: "This is a test thread 9" ,created_on: now  ,bumped_on: now, reported: false, delete_password: 'testdeletepassword1', 
           replies: [
             {_id: new ObjectId(), text: "This is a test reply", created_on: now, reported: false, delete_password: 'deletereplypassword1'},
             {_id: new ObjectId(), text: "This is a test reply 2" ,created_on: now, reported: false, delete_password: 'deletereplypassword1'},
             {_id: new ObjectId(), text: "This is a test reply 3" ,created_on: now, reported: false, delete_password: 'deletereplypassword1'},
             {_id: new ObjectId(), text: "This is a test reply 4" ,created_on: now, reported: false, delete_password: 'deletereplypassword1'},
             {_id: new ObjectId(), text: "This is a test reply 5" ,created_on: now, reported: false, delete_password: 'deletereplypassword1'},
         ]},
                { text: "This is a test thread 10" ,created_on: now  ,bumped_on: now, reported: false, delete_password: 'testdeletepassword1', 
           replies: [
             {_id: new ObjectId(), text: "This is a test reply", created_on: now, reported: false, delete_password: 'deletereplypassword1'},
             {_id: new ObjectId(), text: "This is a test reply 2" ,created_on: now, reported: false, delete_password: 'deletereplypassword1'},
             {_id: new ObjectId(), text: "This is a test reply 3" ,created_on: now, reported: false, delete_password: 'deletereplypassword1'},
             {_id: new ObjectId(), text: "This is a test reply 4" ,created_on: now, reported: false, delete_password: 'deletereplypassword1'},
             {_id: new ObjectId(), text: "This is a test reply 5" ,created_on: now, reported: false, delete_password: 'deletereplypassword1'},
         ]},
                { text: "This is a test thread 11" ,created_on: now ,bumped_on: nowPlus2, reported: false, delete_password: 'testdeletepassword1', 
           replies: [
             {_id: new ObjectId(), text: "This is a test reply 1" ,created_on: now, reported: false, delete_password: 'deletereplypassword1'},
             {_id: new ObjectId(), text: "This is a test reply 2" ,created_on: nowPlus1, reported: false, delete_password: 'deletereplypassword1'},
             {_id: new ObjectId(), text: "This is a test reply 3" ,created_on: nowPlus2, reported: false, delete_password: 'deletereplypassword1'},
         ]},
          { text: "This is a test thread 12" ,created_on: now  ,bumped_on: nowPlus1, reported: false, delete_password: 'testdeletepassword1', 
           replies: [
             {_id: new ObjectId(), text: "This is a test reply 1" ,created_on: now, reported: false, delete_password: 'deletereplypassword1'},
             {_id: new ObjectId(), text: "This is a test reply 2" ,created_on: nowPlus1, reported: false, delete_password: 'deletereplypassword1'},
         ]}
     ]);
      
      try{
        chai.request(server)
            .get('/api/threads/tests')
            .end(function(err, res){
              assert.equal(res.status, 200);
              assert.isArray(res.body);
              assert.lengthOf(res.body, 10); 
              assert.notProperty(res.body[0], 'delete_password');
              assert.notProperty(res.body[0], 'reported');
              assert.property(res.body[0], '_id');
              assert.property(res.body[0], 'created_on');
              assert.property(res.body[0], 'bumped_on');
              //checking sizes & sorting
              //NOTE: this is hacky
              id=res.body[0]._id
              //the last bumped one has 5 comments
              assert.propertyVal(res.body[0], 'text','This is a test thread 2');
              assert.lengthOf(res.body[0].replies, 3);
              assert.propertyVal(res.body[0].replies[2], 'text','This is a test reply 5');
              //the 2nd most recently bumped  has 3 comments
              assert.propertyVal(res.body[1], 'text','This is a test thread 11');
              assert.lengthOf(res.body[1].replies, 3);
              assert.propertyVal(res.body[1].replies[2], 'text','This is a test reply 3');
              //the 3nd most recently bumped has 3 comments
              assert.propertyVal(res.body[2], 'text','This is a test thread 12');
              assert.lengthOf(res.body[2].replies, 2);
              assert.propertyVal(res.body[2].replies[1], 'text','This is a test reply 2');
         });
      } catch(err){
        console.log(err);
      }
    });
      
    });
    
   
    
    suite('PUT', function() {
    // I can report a thread and change it's reported value to true by sending a PUT request to /api/threads/{board} and pass along the thread_id. 
    // (Text response will be 'success')  
      test('PUT /api/threads/tests', async function(){
        try{
          await sleep(2000); // HACK: wait for the write propagation.
          let res=await chai.request(server)
                        .put('/api/threads/tests')
                        .send({thread_id: id});

          assert.equal(res.status, 200);
          expect(res).to.have.header('content-type', 'text/html; charset=utf-8');
          assert.equal(res.text, 'success');
          let t=await findThread('tests', id);
          assert.exists(t);
          assert.propertyVal(t, 'reported', true);
        }catch(err){
          console.log(err);
        }
       });
    });
    
    suite('DELETE',  function() {
    // I can delete a thread completely if I send a DELETE request to /api/threads/{board} and pass along the thread_id 
    // & delete_password. (Text response will be 'incorrect password' or 'success')  
       test('DELETE /api/threads/tests', async function(){
         this.timeout(15000);

         try{
          let res=await chai.request(server)
            .delete('/api/threads/tests')
            .send({thread_id: id, delete_password: 'testdeletepassword2'});
          
          expect(res).to.have.header('content-type', 'text/html; charset=utf-8');
          assert.equal(res.text, 'success');
          
          let t=await findThread('tests', id);
          assert.equal(t, null);

        } catch(err){
          console.log(err)
        }
       });  
    });    
  });
    
  suite('API ROUTING FOR /api/replies/:board', function() {
    let board='replytests';
    suite('POST', function() {
    // should post a reply to a thread, then query that thread and check that the reply is there, last ammong the replies, that the bumped_on 
    // is updated, that it redirects to  /b/{board}/{thread_id}
        test('POST - post a reply - no redirect', async function(){
            let now= new Date();
            id2= new ObjectId();
            await prepDB(board,  [
            { _id: id2, text: "This is a test thread 1" ,created_on: now  ,bumped_on: now, reported: false, delete_password: 'testdeletepassword1', 
               replies: [
                 {_id: new ObjectId(), text: "This is a test reply", created_on: now, reported: false, delete_password: 'deletereplypassword1'},
                 {_id: new ObjectId(), text: "This is a test reply 2" ,created_on: now, reported: false, delete_password: 'deletereplypassword1'},
                 {_id: new ObjectId(), text: "This is a test reply 3" ,created_on: now, reported: false, delete_password: 'deletereplypassword1'},
                 {_id: new ObjectId(), text: "This is a test reply 4" ,created_on: now, reported: false, delete_password: 'deletereplypassword1'},
                 {_id: new ObjectId(), text: "This is a test reply 5" ,created_on: now, reported: false, delete_password: 'deletereplypassword1'},
             ]}]);
            await sleep(2000); // HACK: wait for the write propagation. A bit hacky
            let text="this is a new reply bla bla bla";
            let res=await chai.request(server)
                .post('/api/replies/'+ board)
                .query({redirect: 'false'})
                .send({ text: text, delete_password: 'replypassword', thread_id: id2});
            assert.equal(res.status, 200);
            assert.notProperty(res.body, 'delete_password');
            assert.notProperty(res.body, 'reported');
            assert.property(res.body, '_id');
            id=res.body._id;
            assert.property(res.body, 'created_on');
            assert.property(res.body, 'bumped_on');
            assert.notEqual(res.body.bumped_on,res.body.created_on);  //posting the reply bumps the thread 
            assert.isArray(res.body.replies);
            assert.propertyVal(res.body.replies[res.body.replies.length - 1], 'text', "this is a new reply bla bla bla");

        });
      
          
        test('POST - post a reply - redirects', function(done){
        let text="this is a new reply bla bla bla";
        chai.request(server)
            .post('/api/replies/'+ board)
            .send({ text: text, delete_password: 'replypassword', thread_id: id2})
            .end(function(err, res){
              assert.equal(res.status, 200);
              assert.equal(url.parse(res.redirects[0]).path, '/b/replytests/'+ id2 );
              done();
         });
      });
      
      
    });
                
    suite('GET', function() {
    // I can GET an entire thread with all it's replies from /api/replies/{board}?thread_id={thread_id}. Also hiding reported and password. 
      test('GET - get all replies from a thread', function(done){
        let text="this is a new reply bla bla bla";
        chai.request(server)
            .get('/api/replies/'+ board)
            .query({ thread_id: id2.toString()})
            .end(function(err, res){
              assert.equal(res.status, 200);
              assert.notProperty(res.body, 'delete_password');
              assert.notProperty(res.body, 'reported');
              assert.property(res.body, '_id');
              threadId=res.body._id;
              assert.property(res.body, 'created_on');
              assert.property(res.body, 'bumped_on');
              // assert.equal(res.body.created_on,res.body.bumped_on);   
              assert.isArray(res.body.replies);
              assert.property(res.body.replies[0], 'text');
              assert.property(res.body.replies[0], '_id');
              assert.property(res.body.replies[0], 'created_on');
              replyId=res.body.replies[0]._id;
              assert.notProperty(res.body.replies[0], 'delete_password');
              assert.notProperty(res.body.replies[0], 'reported');

              done();
             });
      });
   });   
    
    suite('PUT', function() {
    // I can report a reply and change it's reported value to true by sending a PUT request to /api/replies/{board} and pass along 
    // the thread_id & reply_id. (Text response will be 'success')
      test('PUT - report a reply', async function(){
        let res = await chai.request(server)
            .put('/api/replies/'+ board)
            .send({ thread_id: threadId, reply_id: replyId })
        assert.equal(res.text, 'success');
          let rep=await isReported(board, threadId, replyId);
          assert.equal(rep, true);

         
      });
      
      test('PUT - report a reply on a non-existing thread', function(done){
        chai.request(server)
            .put('/api/replies/'+ board)
            .send({ thread_id: new ObjectId().toString(), reply_id: replyId  })
            .end(function(err, res){
              assert.equal(res.text, 'not success');
              done();
         });
      });
      
      test('PUT - report a non existing reply', function(done){
        chai.request(server)
            .put('/api/replies/'+ board)
            .query({redirect: 'false'})
            .send({ thread_id: threadId, reply_id: new ObjectId().toString() })
            .end(function(err, res){
              assert.equal(res.text, 'not success');
              done();
         });
      });
      
      
    });
    
    suite('DELETE', function() {
    // I can delete a post(just changing the text to '[deleted]') if I send a DELETE request to /api/replies/{board} and pass along the thread_id, 
    // reply_id, & delete_password. (Text response will be 'incorrect password' or 'success')  
      test('DELETE - existing reply -  bad password', async function(){
        
        let res= await chai.request(server)
          .delete('/api/replies/'+ board)
          .send({thread_id: threadId, reply_id: replyId, delete_password: 'badreplypassword' });
          
        assert.equal(res.status, 200);
        assert.propertyVal(res, 'text', 'incorrect password');
        await sleep(2000);
        assert.notEqual(await replyText(board, threadId, replyId), 'deleted');
        
      });  
      
        test('DELETE - existing reply', async function(){
        let res= await chai.request(server)
          .delete('/api/replies/'+ board)
          .send({thread_id: threadId, reply_id: replyId, delete_password: 'deletereplypassword1' });
          
        assert.equal(res.status, 200);
        assert.propertyVal(res, 'text', 'success');
        await sleep(2000);

        assert.equal(await replyText(board, threadId, replyId), 'deleted');
        
      });  
          
        test('DELETE - bad reply id', function(done){
        chai.request(server)
          .delete('/api/replies/'+ board)
          .send({thread_id: threadId, reply_id: new ObjectId(), delete_password: 'replypassword' })
          .end(function(err, res){
            assert.equal(res.status, 200);
            assert.propertyVal(res, 'text', 'incorrect password');
            done();
        }); });  
  });
    });    
  

});

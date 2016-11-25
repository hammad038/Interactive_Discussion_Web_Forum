var email = require("nodemailer");
var express = require('express');
var router = express.Router();
var mongodb = require('mongodb');
var async = require('async');
var client = mongodb.MongoClient;
var Db = mongodb.Db;
var Server = mongodb.Server;

var bodyParser = require('body-parser'); // for reading POSTed form data into `req.body`
var expressSession = require('express-session');
var cookieParser = require('cookie-parser'); // the session is stored in a cookie, so we use this to parse it

var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.use(cookieParser());

app.use(expressSession({secret:'somesecrettokenhere'}));

app.use(bodyParser());
http.listen(8080);

io.on('connection', function(socket){

    var rec;
    var db = new Db('askhere', new Server('localhost', '27017'));

    db.open(function (err, db) {
        var url = 'mongodb://localhost:27017/askhere';
        db.authenticate('', '', function (err, result) {
            client.connect(url, function (err, db) {
                var questioncol = db.collection('allanswers');

                questioncol.find({}).sort({_id: -1}).limit(1).toArray(function(err, q) {
                    q.forEach(function (record) {
                        rec = record.ANS_ID;
                        console.log();
                        console.log("RECORDS IN rec" + parseInt(rec));
                        updateAnswer(socket, rec);
                    });
                });
            });
        });
    });
});

function updateAnswer(socket ,rec){
    console.log('a user connected');
    socket.on('disconnect', function(){
        console.log('user disconnected');
    });
    socket.on('NewAnswer', function(msg){
        console.log("AllesMsg: "+msg );
        var id = parseInt(msg.split(" ")[0]);
        var user = msg.split(" ")[1];
        var answer = msg.substr(msg.indexOf(msg.split(" ")[2]),(msg.length));
        var db = new Db('askhere', new Server('localhost', '27017'));
        db.open(function (err, db) {
            db.authenticate('', '', function (err, result) {
                var url = 'mongodb://localhost:27017/askhere';
                client.connect(url, function (err, db) {
                    var answerscol = db.collection('allanswers');
                    console.log("In submitting answer");
                    console.log(parseInt(rec));
                    console.log(parseInt(rec)+parseInt(1));
                    var document = {ANS_ID:parseInt(rec)+parseInt(1),ANS:answer,USER:user,Q_ID:id};
                    answerscol.insert(document, function(err, result) {if(!err)db.close();});
                });
            });
        });


        var db = new Db('askhere', new Server('localhost', '27017'));
        db.open(function (err, db) {
            db.authenticate('', '', function (err, result) {
                var url = 'mongodb://localhost:27017/askhere';
                client.connect(url, function (err, db) {
                    que = new Array();
                    var questioncol = db.collection('allquestions');
                    questioncol.update({Q_ID:parseInt(id)}, {'$addToSet':{"Q_ANS_ID": parseInt(rec)+parseInt(1)}}, function(err, result) {
                        if (err) throw err;
                        if (!err) console.log('addToSet.' );db.close();
                    });
                });
            });
        });


        io.emit('NewAnswer', msg);//send again to client
        io.emit('NewAnswer', "This is the message after");

    });

}

router.get('/', function(req, res) {
    if (!req.session.userName) {
        res.render('index');
    }else{
        var db = new Db('askhere', new Server('localhost', '27017'));

        db.open(function (err, db) {
            db.authenticate('', '', function (err, result) {
                var rec;
                //*********get data from DB *********
                var url = 'mongodb://localhost:27017/askhere';
                client.connect(url, function (err, db) {
                    console.log('DB connected');
                    que = new Array();                                                      //
                    var questioncol = db.collection('allquestions');
                    questioncol.find({}).count(function (err, data) {
                        rec = data;
                        processRequest(rec,req,res);
                    });
                });
            });
        });
    }
});
router.get('/pagination', function(req, res) {
    if (!req.session.userName) {
        res.render('index');
    }else {
        var numberOfpages = req.query['nop'];//4
        console.log("Noof pages:" + numberOfpages);
        //var firstId = req.query['fid'];//10
        //console.log("fid: "+firstId);
        var start = req.query['start'];//10
        console.log("start:" + start);
        var end = req.query['end'];//8
        console.log("end:" + end);
        var lln = req.query['lln'];//5
        console.log("lln:" + lln);
        if (!req.session.userName) {
            res.render('index');
        } else {
            var db = new Db('askhere', new Server('localhost', '27017'));

            db.open(function (err, db) {
                db.authenticate('', '', function (err, result) {
                    var rec;
                    //*********get data from DB *********
                    var url = 'mongodb://localhost:27017/askhere';
                    client.connect(url, function (err, db) {
                        console.log('DB connected');
                        que = new Array();                                                      //
                        var questioncol = db.collection('allquestions');
                        questioncol.find({}).sort({Q_ID: -1}).limit(1).toArray(function(err, q) {
                            q.forEach(function (record) {
                                rec = record.Q_ID;
                                processPaginationRequest(rec, req, res, numberOfpages, start, end, lln);
                            });
                        });
                    });
                });
            });
        }
    }
});
function processPaginationRequest(rec,req,res,numberOfpages,start,end,lln){
    var firstId = parseInt(rec);
    var db = new Db('askhere', new Server('localhost', '27017'));
    db.open(function (err, db) {
        db.authenticate('', '', function (err, result) {

            //*********get data from DB *********
            var url = 'mongodb://localhost:27017/askhere';
            client.connect(url, function (err, db) {
                que = new Array();
                var questioncol = db.collection('allquestions');

                questioncol.find({ Q_ID: {$gte:parseInt(end), $lte:parseInt(start)}}).sort({Q_ID: -1}).toArray(function(err, q) {
                    console.log(JSON.stringify(q));
                    counter = 0;
                    q.forEach(function (questions) {
                        console.log(questions.Q_ID);
                        que[counter] = questions.Q_ID;
                        counter++;
                        console.log(questions.Q_TITLE);
                        que[counter] = questions.Q_TITLE;
                        counter++;
                        console.log(questions.Q_DESC);
                        que[counter] = questions.Q_DESC;
                        counter++;
                        que[counter] = questions.ASKBY;
                        counter++;
                    });
                    res.render('mainqa', {uname:req.session.userName, qarr: que, nop:numberOfpages,lln:1,fid:firstId });
                });
            });
        });
    });
}
function processRequest(rec,req,res,start,end){
    var numberOfpages;
    var start = 0;
    var firstId;
    if (!req.session.userName){

        var username = req.body.username;
        var password = req.body.password;


        var db = new Db('askhere', new Server('localhost', '27017'));
        db.open(function (err, db) {
            db.authenticate('', '', function (err, result) {

                //*********get data from DB *********
                var url = 'mongodb://localhost:27017/askhere';
                client.connect(url, function (err, db) {
                    que = new Array();
                    var questioncol = db.collection('allquestions');

                    if(start === 0 ) {
                        start = firstId = parseInt(rec);
                        console.log("START: "+start);
                        end   = parseInt(rec)-parseInt(2);
                        console.log("End: "+end);
                        numberOfpages = parseInt(rec)/3;
                        if(numberOfpages % 1 === 0)
                            numberOfpages = numberOfpages;
                        else
                            numberOfpages = parseInt(numberOfpages)+1;
                        console.log("Number of pages: "+numberOfpages);
                    }

                    questioncol.find({ Q_ID: {$gte:end, $lte:start}}).sort({Q_ID: -1}).toArray(function(err, q) {
                        //questioncol.find({}).sort({Q_ID: -1}).toArray(function (err, q) {
                        console.log(JSON.stringify(q))
                        counter = 0;
                        q.forEach(function (questions) {
                            console.log(questions.Q_ID);
                            que[counter] = questions.Q_ID;
                            counter++;
                            console.log(questions.Q_TITLE);
                            que[counter] = questions.Q_TITLE;
                            counter++;
                            console.log(questions.Q_DESC);
                            que[counter] = questions.Q_DESC;
                            counter++;
                            que[counter] = questions.ASKBY;
                            counter++;
                        });
                    });

                    var col = db.collection('allusers');
                    var document = {username: username};

                    col.find(document).toArray(function (err, items) {
                        console.log('items: ' + JSON.stringify(items));
                        items.forEach(function (doc) {
                            console.log(doc.password + " == " + password);
                            if (doc.password == password) {
                                req.session.userName = doc.username;
                                db.close();
                                console.log("NO OF RECORDS: " + rec);
                                res.render('mainqa', {uname: doc.username, qarr: que, nop:numberOfpages,lln:1,fid:firstId });
                            }
                            else {
                                console.log("Incorrect username or password");
                                res.render('index');
                            }
                        });
                    });
                });
            });
        });
    }else{ // session is available

        var db = new Db('askhere', new Server('localhost', '27017'));
        db.open(function (err, db) {
            db.authenticate('', '', function (err, result) {

                //*********get data from DB *********
                var url = 'mongodb://localhost:27017/askhere';
                client.connect(url, function (err, db) {
                    que = new Array();
                    var questioncol = db.collection('allquestions');

                    if(start === 0 ) {
                        start = firstId = parseInt(rec);
                        end   = parseInt(rec)-parseInt(2);
                        numberOfpages = parseInt(rec)/3;
                        if(numberOfpages % 1 === 0)
                            numberOfpages = numberOfpages;
                        else
                            numberOfpages = parseInt(numberOfpages)+1;
                        console.log("Number of pages: "+numberOfpages);
                    }

                    questioncol.find({ Q_ID: {$gte:end, $lte:start}}).sort({Q_ID: -1}).toArray(function(err, q) {
                        //questioncol.find({}).sort({Q_ID: -1}).toArray(function (err, q) {
                        console.log(JSON.stringify(q))
                        counter = 0;
                        q.forEach(function (questions) {
                            console.log(questions.Q_ID);
                            que[counter] = questions.Q_ID;
                            counter++;
                            console.log(questions.Q_TITLE);
                            que[counter] = questions.Q_TITLE;
                            counter++;
                            console.log(questions.Q_DESC);
                            que[counter] = questions.Q_DESC;
                            counter++;
                            que[counter] = questions.ASKBY;
                            counter++;
                        });
                        res.render('mainqa', {uname:req.session.userName, qarr: que, nop:numberOfpages,lln:1,fid:firstId });
                    });
                });
            });
        });

    }
}
router.post('/welcome', function(req, res) {

    var rec;
    var db = new Db('askhere', new Server('localhost', '27017'));

    db.open(function (err, db) {
        var url = 'mongodb://localhost:27017/askhere';
        db.authenticate('', '', function (err, result) {
            client.connect(url, function (err, db) {
                var questioncol = db.collection('allquestions');
                questioncol.find({}).count(function (err, data) {
                    rec = data;
                    console.log();
                    console.log("RECORDS IN rec"+ parseInt(rec));
                    //parseInt(rec)
                    processRequest(rec,req,res);
                });
            });
        });
    });
});
router.get('/contact', function(req, res) {
    if (!req.session.userName) {
        res.render('contact' , {uname:"Visitor Student"});
    }else {
        //res.render('index', { title: 'Express' });
        res.render('contact' , {uname:req.session.userName});
    }
});
router.get('/askq', function(req, res) {
    if (!req.session.userName) {
        res.render('index');
    }else {
        res.render('askq',{uname:req.session.userName});
    }
});
router.post('/submitq', function(req, res) {
    if (!req.session.userName) {
        res.render('index');
    }else {
        var rec;
        var db = new Db('askhere', new Server('localhost', '27017'));

        db.open(function (err, db) {
            var url = 'mongodb://localhost:27017/askhere';
            db.authenticate('', '', function (err, result) {
                client.connect(url, function (err, db) {
                    var questioncol = db.collection('allquestions');
                    questioncol.find({}).sort({_id: -1}).limit(1).toArray(function(err, q) {
                        q.forEach(function (record) {
                            rec = record.Q_ID;
                            console.log();
                            console.log("RECORDS IN rec" + parseInt(rec));
                            submitQ(rec, res, req);
                        });
                    });
                });
            });
        });
    }
});
function submitQ(rec,res,req){
    console.log(req.body.title);
    console.log(req.body.desc);
    qtitle = req.body.title;
    qdesc = req.body.desc;
    var db = new Db('askhere', new Server('localhost', '27017'));
    db.open(function(err, db) {
        db.authenticate('', '', function(err, result) {

            //********* *********
            var url = 'mongodb://localhost:27017/askhere';
            client.connect(url, function(err, db) {
                var col = db.collection('allquestions');
                var document = {Q_ID:parseInt(rec)+parseInt(1),Q_TITLE:qtitle,Q_DESC:qdesc,ASKBY:req.session.userName,Q_ANS_ID:[]};
                col.insert(document, function(err, result) {});

            });


            var smtpTransport = email.createTransport("SMTP",{
                service: "Gmail",
                auth: {
                    user: "hammad91shah@gmail.com",
                    pass: "asdfghjkl555"
                }
            });

// setup e-mail data with unicode symbols
            var mailOptions = {
                from: "askhere@fh-help.kiel.com", // sender address
                to: "hammad_ali447@yahoo.com", // list of receivers
                subject: "Hello ?", // Subject line
                text: "Hello world ?", // plaintext body
                html: "<b>Hello world ?</b>" // html body
            }

// send mail with defined transport object
            smtpTransport.sendMail(mailOptions, function(error, response){
                if(error){
                    console.log(error);
                }else{
                    console.log("Message sent: " + response.message);
                }

                // if you don't want to use this transport object anymore, uncomment following line
                //smtpTransport.close(); // shut down the connection pool, no more messages
            });
            //***************************************************************************************************************
            var qid = parseInt(rec)+parseInt(1);
            showQuestion(req,res,qid);
        });
    });
}

router.get('/showquestion', function(req, res) {
    if (!req.session.userName) {
        res.render('index');
    }else {
        showQuestion(req,res,req.query.qid);
    }
});

function showQuestion(req,res,qid){
    var loginUser = req.session.userName;
    var db = new Db('askhere', new Server('localhost', '27017'));
    var queid, quetitle, quedesc,askby;
    db.open(function (err, db) {
        db.authenticate('', '', function (err, result) {

            var url = 'mongodb://localhost:27017/askhere';
            client.connect(url, function (err, db) {
                var queid, qtitle, qdesc, qans;
                var questioncol = db.collection('allquestions');
                var docu = {Q_ID: parseInt(qid)};
                console.log(docu);
                questioncol.find(docu).toArray(function (err, q) {
                    console.log('stringify: ' + JSON.stringify(q));
                    q.forEach(function (questions) {
                        console.log(questions.Q_ID);
                        queid = questions.Q_ID;
                        console.log(questions.Q_TITLE);
                        qtitle = questions.Q_TITLE;
                        console.log(questions.Q_DESC);
                        qdesc = questions.Q_DESC;
                        console.log(questions.ASKBY);
                        askby = questions.ASKBY;
                        // getAnswers(questions.Q_ID,questions.Q_TITLE,questions.Q_DESC,loginUser,req,res);
                        getAnswers(queid, qtitle, qdesc,askby ,loginUser, req, res);
                    });
                    console.log("Here is  the queid before sending:" + queid);
                    //getAnswers(queid,qtitle,qdesc,loginUser,req,res);
                    //res.render('showquestion',{queid:queid,qtitle:qtitle,qdesc:qdesc,lu:loginUser});
                });

            });
        });
    });
}
function getAnswers(queid,qtitle,qdesc,askby,loginUser,req,res){

    count =0;
    ans = new Array();
    console.log("QUEID in getanswer:"+queid);
    var db = new Db('askhere', new Server('localhost', '27017'));
    db.open(function(err, db) {
        db.authenticate('', '', function(err, result) {

            var url = 'mongodb://localhost:27017/askhere';
            client.connect(url, function(err, db) {
                var anscol = db.collection('allanswers');
                var docu = {Q_ID:parseInt(queid)};
                console.log(docu);
                anscol.find(docu).toArray(function(err, q) {
                    console.log('stringify: '+JSON.stringify(q));
                    q.forEach(function(answer) {
                        ans[count++] = answer.ANS;
                        ans[count++] = answer.USER;
                        ans[count++] = answer.ANS_ID;
                    });
                    res.render('showquestion',{queid:queid,qtitle:qtitle,qdesc:qdesc,askby:askby,ans:ans,lu:loginUser});
                });

            });
        });
    });
}

router.get('/signup_form', function(req, res) {
    //res.render('index', { title: 'Express' });
    res.render('signup_form');
});

router.post('/signupuser', function(req, res) {


    console.log(req.body.fname);
    console.log(req.body.lname);
    console.log(req.body.email);
    console.log(req.body.username);
    console.log(req.body.password);
    console.log(req.body.repassword);

    var db = new Db('askhere', new Server('localhost', '27017'));
    db.open(function (err, db) {
        db.authenticate('', '', function (err, result) {

            //********* *********
            var url = 'mongodb://localhost:27017/askhere';
            client.connect(url, function (err, db) {


                var col = db.collection('allusers');
                var document = {
                    fname: req.body.fname,
                    lname: req.body.lname,
                    email: req.body.email,
                    username: req.body.username,
                    password: req.body.password
                };
                col.insert(document, function (err, result) {
                });
            });


            var smtpTransport = email.createTransport("SMTP", {
                service: "Gmail",
                auth: {
                    user: "hammad91shah@gmail.com",
                    pass: "asdfghjkl555"
                }
            });

// setup e-mail data with unicode symbols
            var mailOptions = {
                from: "hammad91shah@gmail.com", // sender address
                to: req.body.email, // list of receivers
                subject: "Signup Askhere", // Subject line
                //text: "Hello ", // plaintext body
                html: "Hello! <br/>Your account on Askhere Forum has been created Successfully. Now You can login from this link <a href='http://localhost:3000/'>Login</a> using your credentials.<br/>ThankYou." // html body
            }

// send mail with defined transport object
            smtpTransport.sendMail(mailOptions, function (error, response) {
                if (error) {
                    console.log(error);
                } else {
                    console.log("Account Created Successfully" + response.message);
                }

                // if you don't want to use this transport object anymore, uncomment following line
                //smtpTransport.close(); // shut down the connection pool, no more messages
            });

            res.render('signup_verify');
        });
    });
});

router.get('/logout', function(req, res) {
    req.session.userName = null;
    res.render('index');
});

router.get('/profile', function(req, res) {
    if (!req.session.userName) {
        res.render('index');
    }else {
        getNumberOfQuestionsByUser(res,req.session.userName);
    }
});

function showProfile(res,user,numberOfQuestions,numberOfAnswers,allQuestions,allAnswers){
    console.log("NUM Q: "+numberOfQuestions);
    console.log("NUM A: "+numberOfAnswers);
    console.log("ALL QUESTIONS: "+ JSON.stringify(allQuestions));
    console.log("ALL Answers: "+ JSON.stringify(allAnswers));

    res.render('profile',{uname:user,nq:numberOfQuestions,na:numberOfAnswers,aq:allQuestions,aa:allAnswers});
}

function getNumberOfQuestionsByUser(res,user){

    var db = new Db('askhere', new Server('localhost', '27017'));

    db.open(function (err, db) {
        db.authenticate('', '', function (err, result) {
            var noq;
            //*********get data from DB *********
            var url = 'mongodb://localhost:27017/askhere';
            client.connect(url, function (err, db) {
                var questioncol = db.collection('allquestions');
                questioncol.find({ASKBY:user}).count(function (err, data) {
                    noq =  data;
                    getNumberOfAnswersByUser(res,user,noq);
                });
            });
        });
    });
}
function getNumberOfAnswersByUser(res,user,noq){

    var db = new Db('askhere', new Server('localhost', '27017'));

    db.open(function (err, db) {
        db.authenticate('', '', function (err, result) {
            var noa;
            //*********get data from DB *********
            var url = 'mongodb://localhost:27017/askhere';
            client.connect(url, function (err, db) {
                var anscol = db.collection('allanswers');
                anscol.find({USER:user}).count(function (err, data) {
                    noa =  data;
                    console.log("NUM OF ANSWERS:" + noa);
                    getAllQuestions(res,user ,noq ,noa );
                });
            });
        });
    });
}
function getAllQuestions(res,user,noq,noa){

    var db = new Db('askhere', new Server('localhost', '27017'));
    var que = new Array();
    var  counter = 0;
    db.open(function (err, db) {
        db.authenticate('', '', function (err, result) {
            var url = 'mongodb://localhost:27017/askhere';
            client.connect(url, function (err, db) {
                var questioncol = db.collection('allquestions');
                questioncol.find({ASKBY:user}).toArray(function(err, q) {
                    console.log(JSON.stringify(q))
                    q.forEach(function (questions) {
                        console.log(questions.Q_ID);
                        que[counter] = questions.Q_ID;
                        counter++;
                        console.log(questions.Q_TITLE);
                        que[counter] = questions.Q_TITLE;
                        counter++;
                    });
                    getAllAnswers(res,user,noq,noa,que);
                });

            });
        });
    });
}
function getAllAnswers(res,user,noq,noa,que){
    var counter =0;
    console.log("ALL Answers ....");
    var db = new Db('askhere', new Server('localhost', '27017'));
    var ans = new Array();
    db.open(function (err, db) {
        db.authenticate('', '', function (err, result) {
            var anscol = db.collection('allanswers');
            var url = 'mongodb://localhost:27017/askhere';
            client.connect(url, function (err, db) {
                anscol.find({USER:user}).toArray(function(err, q) {
                    console.log("Answers JSON: "+JSON.stringify(q))
                    q.forEach(function (a) {
                        ans[counter] = a.Q_ID;
                        counter++;
                        ans[counter] = a.ANS;
                        counter++;
                        ans[counter] = a.ANS_ID;
                        counter++;
                    });
                    showProfile(res,user,noq,noa,que,ans);});
            });
        });
    });
}

router.get('/removeque', function(req, res) {
    if (!req.session.userName) {
        res.render('index');
    }else {
        var qid = req.query['qid'];
        var db = new Db('askhere', new Server('localhost', '27017'));
        var ans = new Array();
        db.open(function (err, db) {
            db.authenticate('', '', function (err, result) {
                var anscol = db.collection('allquestions');
                var url = 'mongodb://localhost:27017/askhere';
                db.collection('allquestions', {}, function(err, contacts) {
                    contacts.remove({Q_ID: parseInt(qid)}, function(err, result) {
                        if (err) {
                            console.log(err);
                        }
                        console.log(result);
                        db.close();
                        getNumberOfQuestionsByUser(res,req.session.userName);
                    });
                });
            });
        });
    }
});

router.get('/removeans', function(req, res) {

    if (!req.session.userName) {
        res.render('index');
    }else {
        var aid = req.query['aid'];
        var db = new Db('askhere', new Server('localhost', '27017'));
        var ans = new Array();
        db.open(function (err, db) {
            db.authenticate('', '', function (err, result) {
                var url = 'mongodb://localhost:27017/askhere';
                db.collection('allanswers', {}, function (err, contacts) {
                    contacts.remove({ANS_ID: parseInt(aid)}, function (err, result) {
                        if (err) {
                            console.log(err);
                        }
                        console.log(result);
                        db.close();
                        getNumberOfQuestionsByUser(res, req.session.userName);
                    });
                });
            });
        });
    }
});

router.get('/adminpanel', function(req, res) {

    res.render('adminpanel');
});

router.post('/adminwelcome', function(req, res) {

    console.log("Request Reached");
    console.log(req.body.username);
    console.log(req.body.username);

    var rec;
    var db = new Db('askhere', new Server('localhost', '27017'));
    db.open(function (err, db) {
        var url = 'mongodb://localhost:27017/askhere';
        db.authenticate('', '', function (err, result) {
            client.connect(url, function (err, db) {
                var questioncol = db.collection('allquestions');
                questioncol.find({report:'yes'}).count(function (err, data) {
                    rec = data;
                    reportedQuestions(rec, req, res);
                });
            });
        });
    });

});

function reportedQuestions(rec, req, res){
    var counter;

    var que = new Array();
    if(!req.session.userName) {
        var db = new Db('askhere', new Server('localhost', '27017'));
        db.open(function (err, db) {
            var url = 'mongodb://localhost:27017/askhere';
            db.authenticate('', '', function (err, result) {
                client.connect(url, function (err, db) {
                    var questioncol = db.collection('allquestions');
                    questioncol.find({report: 'yes'}).sort({Q_ID: -1}).toArray(function (err, q) {
                        //questioncol.find({}).sort({Q_ID: -1}).toArray(function (err, q) {
                        console.log(JSON.stringify(q))
                        counter = 0;
                        q.forEach(function (questions) {
                            console.log(questions.Q_ID);
                            que[counter] = questions.Q_ID;
                            counter++;
                            console.log(questions.Q_TITLE);
                            que[counter] = questions.Q_TITLE;
                            counter++;
                            console.log(questions.Q_DESC);
                            que[counter] = questions.Q_DESC;
                            counter++;
                            que[counter] = questions.ASKBY;
                            counter++;
                        });
                    });

                    var col = db.collection('adminusers');
                    var document = {username: req.body.username};
                    console.log('DOC: ' + JSON.stringify(document));
                    col.find(document).toArray(function (err, items) {
                        console.log('items: ' + JSON.stringify(items));
                        items.forEach(function (doc) {
                            console.log(doc.password + " == " + req.body.username);
                            if (doc.password == req.body.username) {
                                req.session.userName = doc.username;
                                db.close();
                                console.log("NO OF RECORDS: " + rec);
                                res.render('reportedquestion', {uname: req.session.userName, qarr: que, rec: rec});
                            }
                            else {
                                console.log("Incorrect username or password");
                                res.render('adminpanel');
                            }
                        });
                    });

                });
            });
        });
    }else{
        console.log("user: "+req.session.userName);
        var db = new Db('askhere', new Server('localhost', '27017'));
        db.open(function (err, db) {
            var url = 'mongodb://localhost:27017/askhere';
            db.authenticate('', '', function (err, result) {
                client.connect(url, function (err, db) {
                    var questioncol = db.collection('allquestions');
                    questioncol.find({report: 'yes'}).sort({Q_ID: -1}).toArray(function (err, q) {
                        //questioncol.find({}).sort({Q_ID: -1}).toArray(function (err, q) {
                        console.log(JSON.stringify(q))
                        counter = 0;
                        q.forEach(function (questions) {
                            console.log(questions.Q_ID);
                            que[counter] = questions.Q_ID;
                            counter++;
                            console.log(questions.Q_TITLE);
                            que[counter] = questions.Q_TITLE;
                            counter++;
                            console.log(questions.Q_DESC);
                            que[counter] = questions.Q_DESC;
                            counter++;
                            que[counter] = questions.ASKBY;
                            counter++;
                        });
                        res.render('reportedquestion', {uname: req.session.userName, qarr: que, rec: rec});
                    });
                });
            });
        });
    }
}



router.get('/rq', function(req, res) {

    console.log("Request Reached");
    console.log(req.body.username);
    console.log(req.body.username);

    var rec;
    var db = new Db('askhere', new Server('localhost', '27017'));
    db.open(function (err, db) {
        var url = 'mongodb://localhost:27017/askhere';
        db.authenticate('', '', function (err, result) {
            client.connect(url, function (err, db) {
                var questioncol = db.collection('allquestions');
                questioncol.find({report:'yes'}).count(function (err, data) {
                    rec = data;
                    rq(rec, req, res);
                });
            });
        });
    });

});

function rq(rec, req, res) {
    var counter;

    var que = new Array();
    if(!req.session.userName) {
        res.render("adminpanel");
    }else {
        var db = new Db('askhere', new Server('localhost', '27017'));
        db.open(function (err, db) {
            var url = 'mongodb://localhost:27017/askhere';
            db.authenticate('', '', function (err, result) {
                client.connect(url, function (err, db) {
                    var questioncol = db.collection('allquestions');
                    questioncol.find({report: 'yes'}).sort({Q_ID: -1}).toArray(function (err, q) {
                        //questioncol.find({}).sort({Q_ID: -1}).toArray(function (err, q) {
                        console.log(JSON.stringify(q))
                        counter = 0;
                        q.forEach(function (questions) {
                            console.log(questions.Q_ID);
                            que[counter] = questions.Q_ID;
                            counter++;
                            console.log(questions.Q_TITLE);
                            que[counter] = questions.Q_TITLE;
                            counter++;
                            console.log(questions.Q_DESC);
                            que[counter] = questions.Q_DESC;
                            counter++;
                            que[counter] = questions.ASKBY;
                            counter++;
                        });
                        res.render('reportedquestion', {uname: req.session.userName, qarr: que, rec: rec});
                    });
                });
            });
        });
    }
}

router.get('/admin_removeque', function(req, res) {
    if (!req.session.userName) {
        res.render('index');
    }else {
        var qid = req.query['qid'];
        var db = new Db('askhere', new Server('localhost', '27017'));
        var ans = new Array();
        db.open(function (err, db) {
            db.authenticate('', '', function (err, result) {
                var anscol = db.collection('allquestions');
                var url = 'mongodb://localhost:27017/askhere';
                db.collection('allquestions', {}, function(err, q) {
                    q.remove({Q_ID: parseInt(qid)}, function(err, result) {
                        if (err) {
                            console.log(err);
                        }
                        console.log(result);
                        db.close();
                    });
                });
            });
        });
        var rec;
        var db = new Db('askhere', new Server('localhost', '27017'));
        db.open(function (err, db) {
            var url = 'mongodb://localhost:27017/askhere';
            db.authenticate('', '', function (err, result) {
                client.connect(url, function (err, db) {
                    var questioncol = db.collection('allquestions');
                    questioncol.find({report:'yes'}).count(function (err, data) {
                        rec = data;
                        reportedQuestions(rec, req, res);
                    });
                });
            });
        });
    }
});


router.get('/reportq', function(req, res) {

    if(!req.session.userName){
        res.render("index");
    }else {
        var qid = req.query['qid'];

        var db = new Db('askhere', new Server('localhost', '27017'));
        db.open(function (err, db) {
            db.authenticate('', '', function (err, result) {
                var url = 'mongodb://localhost:27017/askhere';
                client.connect(url, function (err, db) {
                    var qcol = db.collection('allquestions');
                    var document = {Q_ID: parseInt(qid)};
                    qcol.update(document,{$set:{report:'yes'}} , function (err, result) {
                        if (!err)db.close();
                    });
                });
            });
        });
        res.render('reportsuccess', {uname: req.session.userName});

    }
});

router.get('/reporta', function(req, res) {

    if(!req.session.userName){
        res.render("index");
    }else {
        var aid = req.query['aid'];
        var db = new Db('askhere', new Server('localhost', '27017'));
        db.open(function (err, db) {
            db.authenticate('', '', function (err, result) {
                var url = 'mongodb://localhost:27017/askhere';
                client.connect(url, function (err, db) {
                    var qcol = db.collection('allanswers');
                    var document = {ANS_ID: parseInt(aid)};
                    qcol.update(document,{$set:{report:'yes'}} , function (err, result) {
                        if (!err)db.close();
                    });
                });
            });
        });
        res.render('reportsuccess', {uname: req.session.userName});

    }
});


router.get('/ra', function(req, res) {

    var rec;
    var db = new Db('askhere', new Server('localhost', '27017'));
    db.open(function (err, db) {
        var url = 'mongodb://localhost:27017/askhere';
        db.authenticate('', '', function (err, result) {
            client.connect(url, function (err, db) {
                var questioncol = db.collection('allanswers');
                questioncol.find({report:'yes'}).count(function (err, data) {
                    rec = data;
                    ra(rec, req, res);
                });
            });
        });
    });

});

function ra(rec, req, res) {
    var counter;

    var que = new Array();
    if(!req.session.userName) {
        res.render("adminpanel");
    }else {
        var db = new Db('askhere', new Server('localhost', '27017'));
        db.open(function (err, db) {
            var url = 'mongodb://localhost:27017/askhere';
            db.authenticate('', '', function (err, result) {
                client.connect(url, function (err, db) {
                    var questioncol = db.collection('allanswers');
                    questioncol.find({report: 'yes'}).sort({Q_ID: -1}).toArray(function (err, q) {
                        //questioncol.find({}).sort({Q_ID: -1}).toArray(function (err, q) {
                        console.log(JSON.stringify(q))
                        counter = 0;
                        q.forEach(function (questions) {
                            console.log(questions.ANS_ID);
                            que[counter] = questions.ANS_ID;
                            counter++;
                            console.log(questions.ANS);
                            que[counter] = questions.ANS;
                            counter++;
                            console.log(questions.USER);
                            que[counter] = questions.USER;
                            counter++;
                        });
                        res.render('reportedanswer', {uname: req.session.userName, qarr: que, rec: rec});
                    });
                });
            });
        });
    }
}
router.get('/showquestionAdmin', function(req, res) {
    if (!req.session.userName) {
        res.render('index');
    }else {
        showQuestionAdmin(req,res,req.query.qid);
    }
});

function showQuestionAdmin(req,res,qid){
    var loginUser = req.session.userName;
    var db = new Db('askhere', new Server('localhost', '27017'));
    var queid, quetitle, quedesc,askby;
    db.open(function (err, db) {
        db.authenticate('', '', function (err, result) {

            var url = 'mongodb://localhost:27017/askhere';
            client.connect(url, function (err, db) {
                var queid, qtitle, qdesc, qans;
                var questioncol = db.collection('allquestions');
                var docu = {Q_ID: parseInt(qid)};
                console.log(docu);
                questioncol.find(docu).toArray(function (err, q) {
                    console.log('stringify: ' + JSON.stringify(q));
                    q.forEach(function (questions) {
                        console.log(questions.Q_ID);
                        queid = questions.Q_ID;
                        console.log(questions.Q_TITLE);
                        qtitle = questions.Q_TITLE;
                        console.log(questions.Q_DESC);
                        qdesc = questions.Q_DESC;
                        console.log(questions.ASKBY);
                        askby = questions.ASKBY;
                        // getAnswers(questions.Q_ID,questions.Q_TITLE,questions.Q_DESC,loginUser,req,res);
                        getAnswersAdmin(queid, qtitle, qdesc,askby ,loginUser, req, res);
                    });
                    console.log("Here is  the queid before sending:" + queid);
                    //getAnswers(queid,qtitle,qdesc,loginUser,req,res);
                    //res.render('showquestion',{queid:queid,qtitle:qtitle,qdesc:qdesc,lu:loginUser});
                });

            });
        });
    });
}
function getAnswersAdmin(queid,qtitle,qdesc,askby,loginUser,req,res){

    count =0;
    ans = new Array();
    console.log("QUEID in getanswer:"+queid);
    var db = new Db('askhere', new Server('localhost', '27017'));
    db.open(function (err, db) {
        var url = 'mongodb://localhost:27017/askhere';
        db.authenticate('', '', function (err, result) {
            client.connect(url, function (err, db) {
                var questioncol = db.collection('allanswers');
                questioncol.find({report:'yes'}).count(function (err, data) {
                    rec = data;
                    ra(rec, req, res);
                });
            });
        });
    });

}


router.get('/admin_removeans', function(req, res) {
    if (!req.session.userName) {
        res.render('index');
    }else {
        var aid = req.query['aid'];
        var db = new Db('askhere', new Server('localhost', '27017'));
        var ans = new Array();
        db.open(function (err, db) {
            db.authenticate('', '', function (err, result) {
                var anscol = db.collection('allanswers');
                var url = 'mongodb://localhost:27017/askhere';
                db.collection('allanswers', {}, function(err, contacts) {
                    contacts.remove({ANS_ID: parseInt(aid)}, function(err, result) {
                        if (err) {
                            console.log(err);
                        }
                        console.log(result);
                        db.close();
                    });
                });
            });
        });
        var rec;
        var db = new Db('askhere', new Server('localhost', '27017'));
        db.open(function (err, db) {
            var url = 'mongodb://localhost:27017/askhere';
            db.authenticate('', '', function (err, result) {
                client.connect(url, function (err, db) {
                    var questioncol = db.collection('allanswers');
                    questioncol.find({report:'yes'}).count(function (err, data) {
                        rec = data;
                        ra(rec, req, res);
                    });
                });
            });
        });
    }
});


router.get('/user', function(req, res) {
    var counter = 0;
    if (!req.session.userName) {
        res.render('index');
    }else {

        var usersarr;

        var db = new Db('askhere', new Server('localhost', '27017'));
        db.open(function (err, db) {
            db.authenticate('', '', function (err, result) {

                var url = 'mongodb://localhost:27017/askhere';
                client.connect(url, function (err, db) {
                    usersarr = new Array();
                    var ucol = db.collection('allusers');

                    ucol.find({username:{$ne:"removed"}}).toArray(function(err, u) {
                        console.log(JSON.stringify(u));
                        counter = 0;
                        u.forEach(function (users) {
                            usersarr[counter] = users.username;
                            counter++;
                            usersarr[counter] = users.email;
                            counter++;
                        });
                        res.render('allusers', {uname:req.session.userName, user:usersarr });
                    });

                });
            });
        });

    }
});

router.get('/removeuser', function(req, res) {

    var db = new Db('askhere', new Server('localhost', '27017'));
    db.open(function (err, db) {
        db.authenticate('', '', function (err, result) {
            var url = 'mongodb://localhost:27017/askhere';
            client.connect(url, function (err, db) {
                var qcol = db.collection('allusers');
                var document = {username: req.query['un']};
                qcol.update(document,{$set:{username:'removed'}} , function (err, result) {
                    if (!err)db.close();
                });
            });
        });
    });

    var usersarr;

    var db = new Db('askhere', new Server('localhost', '27017'));
    db.open(function (err, db) {
        db.authenticate('', '', function (err, result) {

            var url = 'mongodb://localhost:27017/askhere';
            client.connect(url, function (err, db) {
                usersarr = new Array();
                var ucol = db.collection('allusers');

                ucol.find({username:{$ne:"removed"}}).toArray(function(err, u) {
                    console.log(JSON.stringify(u));
                    counter = 0;
                    u.forEach(function (users) {
                        usersarr[counter] = users.username;
                        counter++;
                        usersarr[counter] = users.email;
                        counter++;
                    });
                    res.render('allusers', {uname:req.session.userName, user:usersarr });
                });

            });
        });
    });

});


module.exports = router;
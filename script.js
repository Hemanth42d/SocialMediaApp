const express = require("express");
const path = require("path");
const app = express();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const upload = require("./utils/muterConfig");

const userModel = require('./models/user');
const postModel = require('./models/post');
const cookieParser = require("cookie-parser");

app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({ extended : true }));
app.use(express.static(path.join(__dirname, "public")));
app.use(cookieParser());

app.get("/", (req,res) => {
    res.render("index");
});

app.get("/create", (req,res) => {
    res.render('index');
});

app.get('/login', (req,res) => {
    res.render("login")
})

app.get("/profile/upload", isLoggedIn,(req,res) => {
    res.render('profilePic');
});

app.post("/upload", isLoggedIn , upload.single("image") , async (req,res) => {
    let user = await userModel.findOne({email : req.user.email});
    user.profilePic = req.file.filename;
    await user.save();
    res.redirect("/profile"); 
});


app.post("/create", (req,res) => {
    let {username, name, email, password, age} = req.body;
    bcrypt.genSalt(10, (err,salt) => {
        bcrypt.hash(password, salt, async (err,hash) => {
            let createdUser = await userModel.create({
                username,
                name,
                email,
                password : hash,
                age
            });
            console.log(createdUser);
            let token = jwt.sign({ email , userId : createdUser._id}, "shhhhhhh");
            res.cookie("token", token);
            res.send("user Created")
        });
    });
});

app.post("/login" , async (req,res) => {
    let currentUser = await userModel.findOne({email : req.body.email});
    if(!currentUser) return res.send("Something Went Wrong");
    bcrypt.compare(req.body.password, currentUser.password, (err,result) => {
        if(result) {
            let token = jwt.sign({ email: req.body.email , userId : currentUser._id}, "shhhhhhh");
            res.cookie("token", token);
            res.redirect("/profile")
        }else{
            res.send("Something went wrong");
        }
    });
});

app.get("/profile", isLoggedIn , async (req,res) => {
    let user = await userModel.findOne({email : req.user.email}).populate("posts");
    res.render("profile", {user : user});
});

app.get("/like/:id", isLoggedIn , async (req,res) => {
    let post = await postModel.findOne({_id : req.params.id}).populate("user");

    if(post.like.indexOf(req.user.userId) === -1){
        post.like.push(req.user.userId);
    }else{
        post.like.splice(post.like.indexOf(req.user.userId), 1);
    }
    await post.save();
    res.redirect("/profile"); 
});

app.get("/edit/:id", isLoggedIn , async (req,res) => {
    let post = await postModel.findOne({_id : req.params.id});
    res.render('edit', {post})
});

app.post("/update/:id", isLoggedIn , async (req,res) => {
    let post = await postModel.findOneAndUpdate({_id : req.params.id}, {content : req.body.content} );
    res.redirect('/profile');
});

app.post("/post", isLoggedIn , async (req,res) => {
    let user = await userModel.findOne({email : req.user.email});
    let { content } = req.body;
    let post = await postModel.create({
        user : user._id,
        content
    });
    console.log(post);
    user.posts.push(post._id);
    await user.save();
    res.redirect('/profile');
});

app.get("/logout", (req,res) => {
    let token = "";
    res.cookie("token", token);
    res.redirect('/login');
});

app.get("/delete/:id", async (req,res) => {
    let post = await postModel.findOneAndDelete({_id : req.params.id});
    res.redirect("/profile");
})


function isLoggedIn(req,res,next){
    if(req.cookies.token == "") return res.render('login');
    else{
        let data = jwt.verify(req.cookies.token, "shhhhhhh")
        req.user = data;
        next();
    }
};

app.listen(3000, () => {
    console.log(`http://localhost:${3000}`);
});

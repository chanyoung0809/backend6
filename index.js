const express = require("express");
const MongoClient = require("mongodb").MongoClient;
//데이터베이스의 데이터 입력,출력을 위한 함수명령어 불러들이는 작업
const app = express();
const port = 3000;

//ejs 태그를 사용하기 위한 세팅
app.set("view engine","ejs");
//사용자가 입력한 데이터값을 주소로 통해서 전달되는 것을 변환(parsing)
app.use(express.urlencoded({extended: true}));
app.use(express.json()) 
//css/img/js(정적인 파일)사용하려면 이코드를 작성!
app.use(express.static('public'));

//데이터 베이스 연결작업
let db; //데이터베이스 연결을 위한 변수세팅(변수의 이름은 자유롭게 지어도 됨)

MongoClient.connect("mongodb+srv://cisalive:cisaliveS2@cluster0.cjlsn98.mongodb.net/?retryWrites=true&w=majority",function(err,result){
    //에러가 발생했을경우 메세지 출력(선택사항)
    if(err) { return console.log(err); }

    //위에서 만든 db변수에 최종연결 ()안에는 mongodb atlas 사이트에서 생성한 데이터베이스 이름
    db = result.db("ex5");

    //db연결이 제대로 됬다면 서버실행
    app.listen(port,function(){
        console.log("서버연결 성공");
    });

});

// 메인 페이지
app.get("/",(req,res)=>{
    res.render("index");
});

// 게시물 목록
app.get("/board/list",(req,res)=>{
    //게시물 DB에 접근해서 모두 꺼내오고
    db.collection("board").find().toArray((err,result)=>{
        //data라는 이름으로 데이터 전부 보냄
        res.render("brd_list.ejs",{data:result});
    })
});

// 게시글 작성 페이지
app.get("/board/insert",(req,res)=>{
    res.render("brd_insert");
});

//입력한 게시글 데이터 -> DB에 저장 처리
app.post("/dbinsert",(req,res)=>{
    //카운트 숫자 세줄 DB에 접근해서 하나만 꺼내옴
    db.collection("count").findOne({name:"게시물갯수"},(err,countResult)=>{
        // board DB에 데이터 삽입
        db.collection("board").insertOne({
            num:countResult.boardCount,
            title:req.body.title,
            author:req.body.author,
            content:req.body.content
        },(err,result)=>{
            //게시글 번호 업데이트
            db.collection("count").updateOne({name:"게시물갯수"},{$inc:{boardCount:1}}, (err, result)=>{
                // 게시글 작성 완료 후 해당 게시글 번호의 데이터 값을 불러와서
                // 해당 상세 페이지로 이동할 수 있도록 주소에 게시글 번호 붙여줌
                res.redirect("/board/detail/"+countResult.boardCount)
            })
        })
    })
});
//게시글 상세화면페이지로 요청
app.get("/board/detail/:num",(req,res)=>{
    // find로 url파라미터에 해당하는 게시물 컨텐츠를 찾아와서
    db.collection("board").findOne({num:Number(req.params.num)},(err,result)=>{
        // 상세 페이지를 랜더링하면서 보여주고 싶은 데이터값을 전달한다
        res.render("brd_detail", {data:result});
    })  
})
//게시글 상세화면 페이지에서 삭제를 눌렀을 때 요청
app.get("/dbdelete/:num", (req,res)=>{
    // 보드에서 파라미터에 해당하는 게시글 삭제하고
    db.collection("board").deleteOne({num:Number(req.params.num)},(err,result)=>{
        //게시물 목록으로 이동
        res.redirect("/board/list");
    })
})

//체크박스로 선택한 게시글 삭제 요청
app.get("/dbseldel",(req,res)=>{
    // req.query.delOk -> 선택한 체크박스 value값이 문자열 배열로 출력됨 -> 정수데이터로 변환해줘야 함
    let changeNumber = []; //빈배열 준비하고
    req.query.delOk.forEach((el)=>{
        // 배열 안에 숫자 데이터 삽입
        changeNumber.push(Number(el));
    })
    //변환된 게시글 번호 갯수들만큼 실제 데이터베이스에서 다중삭제 처리 deleteMany()
    // $in:숫자열배열이름 <- 배열명에 있는 데이터랑 매칭되는 것들을 삭제
    db.collection("board").deleteMany({num:{$in:changeNumber}},(err,result)=>{
        res.redirect("/board/list"); //삭제 후 게시글 목록 페이지로 이동
    })
})
// https://www.mongodb.com/docs/manual/reference/method/ <- 몽고DB 명령어 목록

// 게시글 수정 페이지 렌더링
app.get("/board/update/:num",(req, res)=>{
    // DB에 저장돼있는 게시글 번호와 제목, 작성자를 가져와야 함
    // 해당 수정 페이지로 전달해주면서 input태그 value 값으로 표시해서 보여줘야 함
    // 해당 게시글 페이지에 있는 제목, 번호, 작성자만 가져와야 함
    // url 주소창에 적어서 보내주는 데이터들은 전부 string이라서, 변환 작업 필요
    db.collection("board").findOne({num:Number(req.params.num)}, (err, result)=>{
        // req.params.num에 맞는 데이터를 가져오기
        res.render("brd_update.ejs", {data:result})
    })
})

// 실제 데이터베이스 update 처리
app.post("/dbupdate", (req, res)=>{
    db.collection("board").updateOne({num:Number(req.body.num)},{$set:{
        title:req.body.title,
        author:req.body.author,
        content:req.body.content
    }},(err, result)=>{
        res.redirect(`/board/detail/${req.body.num}`) 
        //데이터베이스 데이터 수정 후 게시글 목록으로 요청
    })
})

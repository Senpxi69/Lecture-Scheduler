const { name } = require('ejs');
const express = require('express');
const mongoose = require("mongoose");
const bodyParser = require("body-parser")
const multer = require('multer');
const storage = multer.memoryStorage();
const serverless = require("serverless-http")

const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
const upload = multer({ storage: storage });

mongoose.connect("mongodb+srv://kartikvyas02:Karv9028@cluster0.irmndaj.mongodb.net/?retryWrites=true&w=majority");

const lectureSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    scheduledDateTime: {
        type: Date,
        required: true
    },
    instructor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Instructor'
    },
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Courses'
    }
});

const instructorSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    contact: {
        type: String,
        required: true
    },
    expertise: {
        type: String,
        required: true
    },
    lectures: [lectureSchema],
    email:{
        type:String,
        required:true
    },
    password:{
        type:String,
        required:true
    }
});

const courseschema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    level: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    image: {
        data: Buffer, 
        contentType: String
    },
    lectures: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lecture'
    }]
});

const Instructor = mongoose.model("Instructor", instructorSchema);
const Lecture = mongoose.model("Lecture", lectureSchema);
const Courses = mongoose.model("Course", courseschema);

app.use(express.static("public"));
app.set('view engine', 'ejs');

app.get("/", async (req, res) => {
    try {
        const data = await Courses.find();
        res.render("index", { Courses: data });
    } catch (err) {
        console.error("Error:", err);
        res.status(500).send("Server Error");
    }
});

app.get("/instructor", async (req, res) => {
    try {
        const data = await Instructor.find();
        res.render("Instructor", { instructors: data });
    } catch (err) {
        console.error("Error:", err);
        res.status(500).send("Server Error");
    }
});

app.get("/courses", (req, res) => {
    res.render("course");
});

app.post("/courses", upload.single('courseImage'), async (req, res) => {
    try {
        const newCourse = new Courses({
            name: req.body.name,
            level: req.body.level,
            description: req.body.description,
        });

        await newCourse.save();
        res.redirect("/");
    } catch (err) {
        console.error("Error:", err);
        res.status(500).send("Error creating the course");
    }
});

app.get('/lectures/:courseId', async (req, res) => {
    try {
        const courseId = req.params.courseId;
        const course = await Courses.findById(courseId);
        const lectures = await Lecture.find({ course: courseId }).populate('instructor');
        res.render('lectures', { course, lectures });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Server Error');
    }
});

app.get("/courses/:courseid/add-lecture", async (req, res) => {
    try {
        const courseId = req.params.courseid;
        const course = await Courses.findById(courseId);
        const instructors = await Instructor.find();
        res.render('add-lectures', { course, instructors });
    } catch (err) {
        console.error("Error:", err);
        res.status(500).send("Server Error");
    }
});

app.post('/courses/:courseId/add-lecture', async (req, res) => {
    try {
        const courseId = req.params.courseId;
        const { title, scheduledDate, scheduledMonth, scheduledYear, instructor } = req.body;
        const scheduledDateTime = new Date(scheduledYear, scheduledMonth - 1, scheduledDate);
        const scheduledDateOnly = new Date(scheduledDateTime); 
        scheduledDateOnly.setHours(0, 0, 0, 0);
        const existingLecture = await Lecture.findOne({
            instructor: instructor,
            scheduledDateTime: scheduledDateTime
        });
        if (existingLecture) {
            return res.status(400).send('Instructor is already scheduled for a lecture on this date');
        } else {
            const newLecture = new Lecture({
                title: title,
                scheduledDateTime: scheduledDateTime,
                instructor: instructor,
                course: courseId
            });
            await newLecture.save();
            return res.redirect(`/lectures/${courseId}`)
        }
    } catch (error) {
        console.error("Error:", error);
        res.status(500).send("Error adding lecture");
    }
});

app.get("/add-instructor",(req,res)=>{
    res.render("add-instructor");
})

app.post('/add-instructor', (req, res) => {
    const { name, contact, expertise, email, password } = req.body;
  
    const newInstructor = new Instructor({
      name,
      contact,
      expertise,
      email,
      password
    });
  
    newInstructor.save()
      .then(savedInstructor => {
        res.redirect("/instructor")
      })
      .catch(error => {
        console.error('Error adding instructor:', error);
        res.status(500).send('Error adding instructor');
      });
  });

  app.post("/view-instructor", async (req, res) => {
    const { email, password } = req.body;

    try {
        const instructor = await Instructor.findOne({ email, password });

        if (instructor) {
            res.redirect(`/view-instructor/${instructor._id}`);
        } else {
            res.status(401).send('Wrong Email or Password');
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
});

app.get('/view-instructor/:instructorId', async (req, res) => {
    const instructorId = req.params.instructorId;

    try {
        const instructor = await Instructor.findById(instructorId);
        if (!instructor) {
            return res.status(404).send('Instructor not found');
        }

        const lectures = await Lecture.find({ instructor: instructorId });
        // Fetch lectures where the instructor ID matches the specified instructorId

        res.render('view-instructor', { instructor, lectures });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
});

app.get("/instructor-list", async (req, res) => {
    try {
        const instructors = await Instructor.find();
        res.render("instructor-list", { instructors });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
});

app.listen(port,()=>{
    console.log(`app running on port ${port}`)
})

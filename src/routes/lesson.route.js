const {Router} = require("express")
const { verifyJWT } = require("../middleware/auth.middleware")
const { 
    createLesson,
    addVideoLesson,
    editLesson,
    getLessonsByCourse,
    deleteVideo,
    deleteLessonById
 } = require("../controllers/lesson.controller")
const upload = require("../middleware/multer.middleware")
const router = Router()
router.route("/:courseId")
    .post(verifyJWT,upload.single("video"),createLesson)
    .get(verifyJWT,getLessonsByCourse)

router.route("/:courseId/:lessonId")
    .post(verifyJWT,upload.single("video"),addVideoLesson)
    .put(verifyJWT,editLesson)
    .delete(verifyJWT,deleteLessonById)
router.route("/:courseId/:lessonId/:videoId")
    .delete(verifyJWT,deleteVideo)

module.exports = router
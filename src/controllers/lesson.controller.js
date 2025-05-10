const { isValidObjectId,mongoose } = require("mongoose");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/apiError");
const { uploadVideoOnCloudinary, deleteVideoOnCloudinary } = require("../utils/cloudinary");
const { Lesson, Video } = require("../models/lesson.model");
const ApiResponse = require("../utils/apiResponse");
const Course = require("../models/course.model");

const createLesson = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const { lessonTitle, videoTitle } = req.body;

  // Validate fields
  if (!lessonTitle?.trim() || !videoTitle?.trim()) {
    throw new ApiError(400, "Lesson title and video title are required.");
  }

  // Validate course ID
  if (!isValidObjectId(courseId)) {
    throw new ApiError(400, "Invalid course ID.");
  }

  // Check for uploaded video file
  const videoPath = req.file?.path;
  if (!videoPath) {
    throw new ApiError(400, "Video upload failed. Please try again.");
  }

  // Check if course exists
  const course = await Course.findById(courseId);
  if (!course) {
    throw new ApiError(404, "Course not found.");
  }

  // Check course ownership
  if (!course.educator.equals(req.user?._id)) {
    throw new ApiError(403, "You are not the owner of this course.");
  }

  // Upload video to Cloudinary
  const uploadResult = await uploadVideoOnCloudinary(videoPath);
  if (!uploadResult?.url) {
    throw new ApiError(500, "Video upload to Cloudinary failed.");
  }

  // Create video document
  const video = await Video.create({
    videoTitle: videoTitle.trim(),
    videoUrl: uploadResult.url,
  });

  if (!video) {
    throw new ApiError(500, "Failed to create video entry.");
  }

  // Create lesson document
  const lesson = await Lesson.create({
    course: course._id,
    title: lessonTitle.trim(),
    video: [video._id],  // Store video in an array in case of multiple videos
  });

  if (!lesson) {
    throw new ApiError(500, "Failed to create lesson.");
  }

  // Update course content
  course.content.push(lesson._id);
  const updatedCourse = await course.save(); // Ensure the course is saved after adding the lesson

  if (!updatedCourse) {
    throw new ApiError(500, "Failed to update course content.");
  }

  // Return response with success message
  return res.status(200).json(
    new ApiResponse(200, lesson, "Lesson created successfully with video.")
  );
});



const addVideoLesson = asyncHandler(async(req,res)=>{
    //get courseId,lessonId
    //get video and videoTitle
    //first find 
    const{courseId,lessonId} = req.params;
    const {videoTitle} = req.body;
    const filePath = req.file?.path

    if([courseId,lessonId].some((field)=> !field || field.trim()==="")){
        throw new ApiError(400,"courseId or lessonId is required!!")
    }

    const course = await Course.findById(new mongoose.Types.ObjectId(courseId))
    if(!course.educator.equals(req.user?._id)){
        throw new ApiError(403,"you are not owner of this course")
    }

    const response = await uploadVideoOnCloudinary(filePath)
    const video = await Video.create({
        videoTitle: videoTitle.trim(),
        videoUrl: response.url
    })
    const lesson = await Lesson.findById(new mongoose.Types.ObjectId(lessonId))
    lesson.video.push(video._id)
    await lesson.save();
    
    return res
    .status(200)
    .json(
        new ApiError(200,lesson,"video uploaded successfully")
    )
    
})
const editLesson = asyncHandler(async (req,res)=>{
    //get courseId and lessonId
    //get title from body
    //validate courseId,lessonId
    const {lessonId,courseId} = req.params
    const {title} = req.body
    if(!isValidObjectId(courseId)){
        throw new ApiError(403,"invalid course Id")
    }
    if(!isValidObjectId(lessonId)){
        throw new ApiError(403,"invalid lesson Id")
    }
    // if([courseId,lessonId].some((field)=> !field || isValidObjectId(field))){
    //     throw new ApiError(402,"in sufficient data")
    // }
    if(title.trim() === "" || !title){
        throw new ApiError(400,"title can not be empty")
    }
    const lesson = await Lesson.findById(new mongoose.Types.ObjectId(lessonId))
    // validate lesson with course id
    if(!lesson.course.equals(new mongoose.Types.ObjectId(courseId))){
        throw new ApiError(403,"you are not owner of this lesson")
    }
    //check course owner
    const course = await Course.findById(new mongoose.Types.ObjectId(courseId))
    if (!course.educator.equals(req.user?._id)){
        throw new ApiError(403,"unauthorise access || you are not owner of course")
    }
    //validate, title can't be empty
    
    await Lesson.findByIdAndUpdate(lessonId,{
        $set:{
            title
        }
    })
    return res
    .status(200)
    .json(
        new ApiResponse(400,{},"lesson update successfully")
    )
})
const getLessonsByCourse = asyncHandler(async (req,res)=>{
    const {courseId} = req.params;
    if(!isValidObjectId(courseId)){
        throw new ApiError(400,"Invalid course Id")
    }
    const lessons = await Lesson.find({course:new mongoose.Types.ObjectId(courseId)}).populate("video")
    if(!lessons || lessons.length === 0){
        throw new ApiError(404,"No lessons found for this course")
    }
    return res
    .status(200)
    .json(
        new ApiResponse(200,lessons,"all lessons fetched")
    )
})

const deleteVideo = asyncHandler(async (req,res)=>{
    const{courseId,lessonId,videoId} = req.params
    if(!isValidObjectId(courseId) || !isValidObjectId(lessonId) || !isValidObjectId(videoId)){
        throw new ApiError(403,"Invalid course Id, lesson Id and video Id");
    }
    //find course and validate ownership
    const course = await Course.findById(new mongoose.Types.ObjectId(courseId))
    if(!course){
        throw new ApiError(404,"this course is not available")
    }

    if(!course?.educator.equals(req?.user._id)){
        throw new ApiError(403,"you are not owner of this course")
    }
    //find lesson and validate it belongs to the course
    const lesson = await Lesson.findById(new mongoose.Types.ObjectId(lessonId))
    if(!lesson || !lesson.course.equals(new mongoose.Types.ObjectId(courseId))){
        throw new ApiError(404,"Lesson not found or does not belong to this course")
    }
    if(!lesson.video.includes(videoId)){
        throw new ApiError(404,"video does not exist")
    }
    
    // Remove the video from the lesson
    lesson.video = lesson.video.filter((id) => id.toString() !== videoId);
    await lesson.save();
    
     // Delete the video from the database
     const video = await Video.findByIdAndDelete(videoId);
     if (!video) {
         throw new ApiError(404, "Video not found");
     }
     
     //delete the video from Cloudinary
     try {
        await deleteVideoOnCloudinary(video.videoUrl)
     } catch (error) {
        console.error("Error deleting video from Cloudinary:",error.message)
     }
     return res
     .status(200)
     .json(
        new ApiResponse(200,{},"video deleted successfully")
     )
})
const deleteLessonById = asyncHandler(async(req,res)=>{
    const {lessonId,courseId} = req.params;
    if(!isValidObjectId(lessonId) || !isValidObjectId(courseId))
        throw new ApiError(401,"Invalid lessonId or courseId")

    const course = await Course.findById(new mongoose.Types.ObjectId(courseId))
    if(!course){
        throw new ApiError(404,"There is no Course")
    }
    
    if(!course?.educator.equals(req?.user._id))
        throw new ApiError(403,"You are not owner of this course")
    if(!course.content.includes(lessonId))
        throw new ApiError(404,"lesson is not present")
    
    const lesson = await Lesson.findById(lessonId)
   
    if(lesson.video.length !== 0)
        throw new ApiError(405,"can not delete whole lesson, It contain video")
    const deletedLesson = await Lesson.findByIdAndDelete(lessonId)
    course.content = course.content.filter((id)=> id.toString() !== lessonId)
    await course.save()
    if(!deletedLesson){
        throw new ApiError(500,"lesson is not found")
    }
    return res
    .status(200)
    .json(
        new ApiResponse(200,{},"lesson deleted successfully")
    )
})
module.exports = {
    createLesson,
    addVideoLesson,
    editLesson,
    getLessonsByCourse,
    deleteVideo,
    deleteLessonById
}
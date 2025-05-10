const Course = require("../models/course.model");
const ApiError = require("../utils/apiError");
const ApiResponse = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");
const {uploadProfileImageOnCloudinary} = require("../utils/cloudinary");
const {mongoose,isValidObjectId}= require("mongoose")

const createCourse = asyncHandler(async (req,res)=>{
    const{courseName,description,title,price,duration,category,taqs} = req.body
    if([courseName,description,price,duration,category].some((field)=> !field || field.trim()==="")){
        throw new ApiError(402,"courseName,description,price,duration,category are required")
    }
    if(price<0 || parseInt(price) < 0){
        throw new ApiError(400,"price cannot be negative or fraction")
    }
   const thumbnailPath = req.file?.path
  
   if(!thumbnailPath){
    throw new ApiError(400,"file path are required!")
   }
   //validate and refine taqs for consistency
   let processedTaqs = []
   if(taqs){
    if(! Array.isArray(taqs)){
        throw new ApiError(400,"taq must be array")
    }
    if(taqs.length>10){
        throw new ApiError(400,"a course have at most 10 taqs")
    }
}
    
    processedTaqs = taqs.map((taq)=> taq.trim().toLowerCase())
   const response = await uploadProfileImageOnCloudinary(thumbnailPath)
   
   if(!response){
    throw new ApiError(500,"unable to upload thumbnail!")
   }
   
    const course = await Course.create(
        {
            courseName:courseName.trim(),
            description:description.trim(),
            price:parseInt(price),
            thumbnail:response?.url,
            category:category.trim(),
            educator:req.user?._id,
            title,
            duration,
            processedTaqs
        }
)
    if(!course){
        throw new ApiError(500,"unable to create your course")
    }
    return res
    .status(200)
    .json(
        new ApiResponse(200,course,"course successfully Created")
    )
})

const updateCourse = asyncHandler(async (req, res) => {
  const { courseId } = req.params;

  if (!isValidObjectId(courseId)) {
    throw new ApiError(400, "Enter a valid Course ID");
  }

  const course = await Course.findById(courseId);
  if (!course) {
    throw new ApiError(404, "Course not found");
  }

  if (!course.educator.equals(req.user?._id)) {
    throw new ApiError(403, `You are not the owner of this course`);
  }

  // Build update object dynamically
  const updateFields = {};
  const allowedFields = ["courseName", "title", "description", "price", "duration", "category"];

  for (let field of allowedFields) {
    if (req.body[field] && req.body[field].trim() !== "") {
      if (field === "price" && parseInt(req.body[field]) < 0) {
        throw new ApiError(400, "Price cannot be negative");
      }
      updateFields[field] = req.body[field].trim();
    }
  }

  const updatedCourse = await Course.findByIdAndUpdate(
    courseId,
    { $set: updateFields },
    { new: true }
  );

  return res.status(200).json(new ApiResponse(200, updatedCourse, "Course updated successfully"));
});

//update thumbnail
const updateThumbnail = asyncHandler(async (req,res)=>{
    const{courseId} = req.params
    if (!isValidObjectId(courseId)) {
    throw new ApiError(400, "Invalid course ID");
}
    const filePath = req.file?.path
    //upload thumbnail on cloudinary
    const response = await uploadProfileImageOnCloudinary(filePath)
    if(!response.url){
        throw new ApiError(500,"unable to upload thumbnail")
    }
    const existedCourse = await Course.findById(new mongoose.Types.ObjectId(courseId))
    if(!existedCourse.educator.equals(req.user?._id)){
        throw new ApiError(402,"you are not owner of course")
    }
    const course = await Course.findByIdAndUpdate(
        new mongoose.Types.ObjectId(courseId),
        {
            $set:{
                thumbnail:response.url
            }
        },
        {new:true}
)
    return res
    .status(200)
    .json(
        new ApiResponse(200,course,"thumbnail updated successfully!!")
    )
})
// getting whole course
const getAllCourse = asyncHandler(async (req,res)=>{
    
    const allCourses = await Course.aggregate([
            {
                $lookup: {
                  from: "users",
                  foreignField: "_id",
                  localField: "educator",
                  pipeline: [
                    {
                      $project: {
                        username: 1,
                        profileImage: 1,
                      },
                    },
                  ],
                  as: "educator",
                },
              },
              {
                $addFields: {
                  educator: {
                    $arrayElemAt: ["$educator", 0],
                  },
                },
              },
        
    ])
    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            allCourses,
            "all courses"
        )
    )
})
//getting specific course by Id
const getCourseById = asyncHandler(async (req,res)=>{
    const{courseId} = req.params

    let course = await Course.findById(new mongoose.Types.ObjectId(courseId))
    .populate({
        path: "content", // Assuming 'content' in Course refers to lessons
        populate: {
            path: "video", // Populate videos inside lessons
            select: "videoTitle videoUrl" // Select only necessary fields
        }
    })
    .populate({
        path: "educator", // Populate educator details
        select: "-password -email -refreshToken" // Exclude sensitive fields
    });
    if(!course){
        throw new ApiError(502,"something went wrong while fetching courses")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200,course,"successfully")
    )
})
//get course category
const listOfCourseCategory = asyncHandler(async(req,res)=>{
    
    let categories = [
        "Artificial Intelligence",
        "Web Development",
        "App Development",
        "Software Development",
        "Language",
        "Game Development",
        "Programming Languages",
        "Graphic Design",
        "UI/UX Design",
        "Video Editing",
        "Cybersecurity",
        "Cloud Computing",
        "Data Science",
        "DevOps",
        "Digital Marketing",
        "Blockchain Technology",
    ]
    return res
    .status(200)
    .json(
        {categories}
    )
})
//getting course by category
const courseCategory = asyncHandler(async(req,res)=>{
    
    const {category} = req.query;
   
    const course = await Course.find({category:category})
                    .select("-content")
                    .populate("educator","profileImage username")
    
    if(!course){
        throw new ApiError(404,"No course found!!")
    }
    if(course.length === 0){
        return res
        .status(200)
        .json(
            new ApiResponse(200,{},"No Courses Available")
        )
    }
    return res
    .status(200)
    .json(
        new ApiResponse(200,course,`${category}:fetched successfully`)
    )
})
const freeCourses = asyncHandler(async(req,res)=>{
    
    const freeCourseList = await Course.find({price:0})
    return res
    .status(200)
    .json(
        new ApiResponse(200,freeCourseList,"All free courses")
    )
})
module.exports = {
    createCourse,
    updateCourse,
    updateThumbnail,
    getAllCourse,
    getCourseById,
    courseCategory,
    listOfCourseCategory,
    freeCourses
}
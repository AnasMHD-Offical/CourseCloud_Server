import instructor_model from "../models/instuctor.js"
import otp_model from "../models/otp.js"
import { send_verification_mail } from "../utils/nodemailer/send_verification_mail.js"
import { generate_otp } from "../utils/otp_generator/otp_genarator.js"
import { hash_password, compare_password } from "../utils/password_manager.js"
import { generate_access_token, generate_refresh_token } from "../utils/JWT/generateTokens.js"
import { store_token } from "../utils/JWT/StoreCookie.js"
import refresh_token_model from "../models/refresh_token.js"
import { get_category } from "./category_controller.js"
import jwt from "jsonwebtoken"
import validator from "validator"
import course_model from "../models/course.js"
import lesson_model from "../models/lesson.js"


//* <------------------------------- Instructor Auth ---------------------------------->
//Controller to handle Instructor login 
const instructor_login = async (req, res) => {
    try {
        const { email, password } = req.body
        //checking the user exist or not
        const response = await instructor_model.findOne({ email })
        const db_password = response?.password
        const is_blocked = response?.is_blocked
        console.log("password", db_password);

        console.log(response);

        if (response) {
            //comparing the passwordsame or not 
            const is_password_same = await compare_password(password, db_password)
            //if password is same the proceed to next
            if (is_password_same) {
                //if the user was blocked by the admin we will send a rejected response with 403 forbidden access
                if (!is_blocked) {
                    const instructor_data = {
                        _id: response?._id,
                        email: response?.email,
                        role: "instructor" // based on the user role it will change
                    }
                    //creating access_token and refresh_token based on user role and data 
                    const access_token = generate_access_token("instructor", instructor_data)
                    const refresh_token = generate_refresh_token("instructor", instructor_data)
                    console.log(access_token, refresh_token);
                    //creating a refresh_token_model based on the credentials
                    const new_refresh_token = new refresh_token_model({
                        token: refresh_token,
                        user: instructor_data?.role,
                        user_id: instructor_data?._id,
                        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) //approximately 7 days
                    })
                    //saving the model to db
                    const saved_token = await new_refresh_token.save()
                    if (saved_token) {
                        // store_token("instructor_access_token", access_token, 15 * 60 * 1000, res)

                        //storing the refresh_token to the cookie 
                        store_token("instructor_refresh_token", refresh_token, 24 * 60 * 60 * 1000, res)
                        //sending  resolved response with 200 status
                        res.status(200)
                            .json({
                                message: "Instructor login successfully", success: true, instructor_data: {
                                    ...instructor_data,
                                    name: response?.name
                                },
                                access_token,
                                role: "instructor"
                            })
                    }
                } else {
                    res.status(403)
                        .json({ message: "Access denied. Instructor was blocked", success: false })
                }
            } else {
                res.status(403)
                    .json({ message: "Invalid email or password", success: false })
            }
        } else {
            res.status(403)
                .json({ message: "Instructor not exist . Try another email or Create an account", success: false })
        }
    } catch (error) {
        console.log(error);

        res.status(500)
            .json({ message: "Something went wrong", success: false, error: error })
    }
}
//controller to handle Instructor Register.
const instructor_register = async (req, res) => {
    try {
        //Destructuring student details from client request
        const { name, mobile, email, dob, password } = req.body
        //Checking if the user exists
        const is_user_exist = await instructor_model.findOne({ email })
        //Chechinking is the user is already exist
        if (is_user_exist) {
            return res.status(409)
                .json({ message: "Instructor already exist. Try another email or Login to your account", success: false })
        }
        //hashing the entered password using an external function
        const hashed_password = await hash_password(password)
        //creating new student 
        const new_instructor = new instructor_model({ name, email, password: hashed_password, dob, mobile })
        //save student deatils to database
        const instructor_saved = await new_instructor.save()

        if (instructor_saved) {
            //providing a resolved response
            return res.status(200)
                .json({ message: "Instructor registered successfully", success: true, instructor_data: { _id: new_instructor._id, name: new_instructor.name, joined_on: new_instructor.created_at } })
        }

    } catch (error) {
        //Previding the reject response
        res.status(500)
            .json({ message: "Something went wrong", success: false, error: error })
    }
}
//Controller to handle sending otp to the registering user to verify
const send_otp = async (req, res) => {
    try {
        //Destructuring the email and name from the sent_otp client request
        const { email, name, For } = req.body
        console.log(req.body);

        // validating the email is on proper structure
        // const checking_validation = validator.isEmail(email)
        // if (!checking_validation) {
        //     return res.status(400)
        //         .json({ message: "Invalid email address", success: false })
        // }
        console.log("here we go");

        // search for the user in the database
        const is_instructor_exist = await instructor_model.findOne({ email: email })
        console.log(is_instructor_exist);
        const instructor_name = is_instructor_exist?.name

        //if the user doesn't exist then genearate otp and save it to the db
        if (!is_instructor_exist && For === "registration" || is_instructor_exist && For === "forgot_password") {
            //calling function to generate otp
            console.log("hey");

            if (!is_instructor_exist || !is_instructor_exist.is_blocked) {
                console.log("hey");
                let otp = await generate_otp()
                //checking is the otp is already on the database then the otp changes whenever the unique value found
                let is_otp_exist = await otp_model.findOne({ otp })
                while (is_otp_exist) {
                    otp = await generate_otp()
                    is_otp_exist = await otp_model.findOne({ otp })
                }
                //create a document of otp with user credentials and otp in db
                const new_otp = await otp_model.create({
                    otp: otp,
                    email: email,
                    name: name || instructor_name,
                    For: For,
                })
                console.log(new_otp);

                //After the document creation in db . sending a resolved response to the client side
                if (new_otp) {
                    return res.status(200)
                        .json({ message: "OTP sent successfully to the given email", success: true })
                }
            } else {
                res.status(403)
                    .json({ message: "Access denied. Instructor was blocked.", success: false })
            }
            //if the user is already exist in the db . sending a reject response to the client side.
        } else {
            res.status(409)
                .json({ message: "Instructor Already exist. Try another email or Login to your account", success: false })
        }
    } catch (error) {
        //sending rejected response when any other errors are thrown.
        res.status(500)
            .json({ message: "Something went wrong", success: false, error: error })
    }
}
//Controller to handle otp validation 
const validate_otp = async (req, res) => {
    try {
        //Destructuring the email and otp from the client side request
        const { email, otp, For } = req.body

        //checking the the otp that sended before and getting the latest sended otp
        const is_otp_found = await otp_model.find({ email, For }).sort({ created_at: -1 }).limit(1)
        console.log(is_otp_found);

        //checking is there is any otp is in the collection
        if (is_otp_found.length != 0) {
            //checking is the sended otp and clent entered otp is same 
            if (otp === is_otp_found[0]?.otp) {
                //sending the resolve response corressponding to the validation otp success
                res.status(200)
                    .json({ message: "OTP verified successfully", success: true, data: { email: email || "" } })
            } else {
                //sending the rejected response corresponding to the validation of otp failed
                res.status(400)
                    .json({ message: "Invalid OTP", success: false })
            }
        } else {
            //sending the rejected response corresponding to when the otp is expired after default time
            res.status(404)
                .json({ message: "OTP expired", success: false })
        }

    } catch (error) {
        //sending reject response corresponding with any other erros.
        res.status(500)
            .json({ message: "Something went wrong", success: false, error: error })
    }
}
//Controller to handle reset password 
const reset_password = async (req, res) => {
    try {
        const { email, password } = req.body
        const Instructor_data = await instructor_model.findOne({ email })
        if (Instructor_data) {
            const hashed_password = await hash_password(password)
            Instructor_data.password = hashed_password
            await Instructor_data.save()
            res.status(200)
                .json({ message: "Password reset successfully", success: true, data: { _id: Instructor_data._id, name: Instructor_data.name } })
        } else {
            res.status(403)
                .json({ message: "Instructor not Exist. Try to register your account", success: false })
        }
    } catch (error) {
        res.status(500)
            .json({ message: "Something went wrong", success: false, error })
    }
}

//* <-------------------------- Instructor Profile management --------------------------> 

//Controller to handle get instructor data
const get_instructor = async (req, res) => {
    try {
        const _id = req.params.id
        console.log(_id);

        const get_instructor = await instructor_model.findOne({ _id })
        console.log(get_instructor);
        if (get_instructor) {
            res.status(200)
                .json({ message: "Instructor data fetched successfully.", success: true, user_data: get_instructor })
        } else {
            res.status(404)
                .json({ message: "Instructor is not exist . try another one", success: false })
        }
    } catch (error) {
        res.status(500)
            .json({ message: "Something went wrong", success: false, error })
    }
}
//Controller to handle edit instructor data
const edit_instructor = async (req, res) => {
    const { name, email, mobile, dob, current_password, new_password, profile, _id } = req.body
    console.log(req.body);

    try {
        let isChanged = false
        const get_instructor = await instructor_model.findOne({ _id })
        if (get_instructor) {
            if (name !== get_instructor.name && name !== "") {
                get_instructor.name = name
                isChanged = true
            }
            if (email !== get_instructor.email && email !== "") {
                get_instructor.email = email
                isChanged = true
            }
            if (mobile !== get_instructor.mobile && mobile !== "") {
                get_instructor.mobile = mobile
                isChanged = true
            }
            if (dob !== get_instructor?.dob && dob !== "") {
                get_instructor.dob = dob
                isChanged = true
            }
            if (current_password !== "" && new_password !== "") {
                const is_password_same = await compare_password(current_password, get_instructor?.password)
                if (is_password_same || !get_instructor?.googleId) {
                    if (new_password !== current_password || new_password !== "") {
                        get_instructor.password = new_password
                        isChanged = true
                    }
                } else if (get_instructor?.googleId) {
                    if (new_password !== "") {
                        get_instructor.password = new_password
                        isChanged = true
                    }
                } else {
                    res.status(400)
                        .json({ message: "Current password is wrong . Try to enter a valid password", success: false })
                }
            }
            if (profile !== get_instructor?.profile && profile !== "") {
                get_instructor.profile = profile
                isChanged = true
            }

            const isUpdated = await get_instructor.save()
            if (isUpdated && !isChanged) {
                res.status(200)
                    .json({ message: "Instructor updated successfully. No changes made", success: true })
            } else {
                res.status(200)
                    .json({ message: "Instructor updated successfully.", success: true })
            }

        } else {
            res.status(404)
                .json({ message: "Instructor not found", success: false })
        }
    } catch (error) {
        res.status(500)
            .json({ message: "Something went Wrong", success: false, error })
    }
}

//* <--------------------------- Create course Management ------------------------------------>

const add_course = async (req, res) => {
    console.log(req.body);

    try {
        const { course_plan, course_curriculam, course_preview, instructor_id } = req.body
        const is_course_exist = await course_model.findOne({ title: { $regex: new RegExp(`^${course_preview.title}$`, 'i') } })
        console.log(is_course_exist);

        if (!is_course_exist) {
            console.log("here");

            const new_course = new course_model({
                title: course_preview.title,
                subtitle: course_preview.subtitle,
                description: course_preview.description,
                instructor_id: instructor_id,
                language: course_preview.language,
                difficulty: course_preview.difficulty,
                category: course_preview.category,
                subCategory: course_preview.subcategory,
                thumbnail: course_preview.thumbnail,
                actual_price: course_preview.price,
                objectives: course_plan.learningObjectives,
                requirements: course_plan.requirements,
                target_students: course_plan.targetAudiences,
                subject: course_preview.subject,
            })
            console.log("hello");

            const created_course = await new_course.save()
            console.log(created_course);

            if (created_course) {
                console.log("here to the lession");
                console.log(created_course._id);

                const duplicateLessons = await Promise.all(
                    course_curriculam.map(async (lesson) => {
                        return await lesson_model.findOne({ title: { $regex: new RegExp(`^${lesson.title}$`, 'i') } })
                    })
                );
                console.log("here to the lession here");
                console.log(duplicateLessons);

                if (duplicateLessons.some((lesson) => lesson !== null)) {
                    return res.status(409).json({
                        message: "Duplicate lessons found. Try creating a course without duplication.",
                        success: false,
                    });
                }

                // Create lessons if no duplicates are found
                const lesson_created = await Promise.all(
                    course_curriculam.map(async (lesson) => {
                        try {
                            console.log("Creating lesson:", lesson);  // Log lesson data

                            const new_lesson = new lesson_model({
                                category_id: created_course._id,
                                title: lesson.title,
                                description: lesson.description,
                                video_tutorial_link: lesson.video_tutorial,
                                assignment_link: lesson.assignment,
                            });

                            const savedLesson = await new_lesson.save();
                            console.log("Lesson created successfully:", savedLesson);
                            return savedLesson;
                        } catch (lessonError) {
                            console.error("Error creating lesson:", lessonError);
                            throw new Error(`Error creating lesson "${lesson.title}": ${lessonError.message}`);
                        }
                    })
                );


                console.log(lesson_created);
                if (lesson_created) {
                    const lessions = lesson_created.map((lesson) => (lesson._id))
                    console.log(lessions);
                    created_course.lessions = lessions
                    const saved_lessons = await created_course.save()
                    if (saved_lessons) {
                        res.status(200)
                            .json({ message: "Course created successfully", success: true, course_id: created_course._id })
                    } else {
                        res.status(400)
                            .json({ message: "unexcpected error while uploading to database", success: false })
                    }

                }




            } else {
                res.status(400)
                    .json({ message: "unexcpected error while uploading to database", success: false })
            }
        } else {
            res.status(409)
                .json({ message: "Course already exist. Try another one", success: false })
        }
    } catch (error) {
        res.status(500)
            .json({ message: "Something went wrong", success: false, error })
    }
}
// const add_course = async (req, res) => {
//     console.log(req.body);

//     try {
//         const { course_plan, course_curriculam, course_preview, instructor_id } = req.body;
//         const is_course_exist = await course_model.findOne({
//             title: { $regex: new RegExp(`^${course_preview.title}$`, 'i') },
//         });
//         console.log(is_course_exist);

//         if (!is_course_exist) {
//             const new_course = new course_model({
//                 title: course_preview.title,
//                 subtitle: course_preview.subtitle,
//                 description: course_preview.description,
//                 instructor_id: instructor_id,
//                 language: course_preview.language,
//                 difficulty: course_preview.difficulty,
//                 category: course_preview.category,
//                 subCategory: course_preview.subcategory,
//                 thumbnail: course_preview.thumbnail,
//                 actual_price: course_preview.price,
//                 objectives: course_plan.learningObjectives,
//                 requirements: course_plan.requirements,
//                 target_students: course_plan.targetAudiences,
//                 subject: course_preview.subject,
//             });
//             const created_course = await new_course.save();
//             console.log("Created course:", created_course);
//             console.log(course_curriculam);


//             if (created_course) {
//                 try {
//                     const lesson_created = await Promise.all(
//                         course_curriculam.map(async (lesson) => {
//                             const new_lesson = new lesson_model({
//                                 category_id: created_course._id, // Ensure this is included and matches schema type
//                                 title: lesson.title,
//                                 description: lesson.description,
//                                 video_tutorial_link: lesson.video_tutorial,
//                                 assignment_link: lesson.assignment,
//                             });
//                             const savedLesson = await new_lesson.save();
//                             console.log("Lesson created successfully:", savedLesson);
//                             return savedLesson;
//                         })
//                     );

//                     console.log("All lessons created successfully:", lesson_created);
//                     res.status(200).json({
//                         message: "Course created successfully",
//                         success: true,
//                         course_id: created_course._id,
//                     });
//                 } catch (lessonError) {
//                     console.error("Error during lesson creation:", lessonError.message, lessonError.stack);
//                     res.status(500).json({
//                         message: "Error creating lessons",
//                         success: false,
//                         error: lessonError.message,
//                     });
//                 }
//             } else {
//                 res.status(400).json({
//                     message: "Unexpected error while uploading to database",
//                     success: false,
//                 });
//             }
//         } else {
//             res.status(409).json({
//                 message: "Course already exists. Try another title.",
//                 success: false,
//             });
//         }
//     } catch (error) {
//         console.error("Error in add_course:", error.message, error.stack);
//         res.status(500).json({
//             message: "Something went wrong",
//             success: false,
//             error: error.message,
//         });
//     }
// };


//exporting instructor controllers
export {
    //Instructor Auth
    instructor_login,
    instructor_register,
    send_otp,
    validate_otp,
    reset_password,
    //Instructor Profile
    get_instructor,
    edit_instructor,
    //Create course manangement
    add_course
}
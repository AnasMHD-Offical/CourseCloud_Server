import mongoose from "mongoose";

const course_schema = mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    subtitle: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    instructor_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "instructor",
        // required: true
    },
    language: {
        type: String,
    },
    difficulty: {
        type: String
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "category"
    },
    subCategory: {
        type: String
    },
    lessons: {
        type: [{ type: mongoose.Schema.Types.ObjectId, ref: "lesson" }],
        required: true
    },
    thumbnail: {
        type: String
    },
    entrolled_count: {
        type: Number
    },
    actual_price: {
        type: String,
    },
    given_price: {
        type: String
    },
    requirements: {
        type: [String]
    },
    objectives: {
        type: [String]
    },
    rating: {
        type: String
    },
    is_blocked: {
        type: Boolean,
        default: false
    },
    offer_percentage: {
        type: String
    },
    target_students: {
        type: [String]
    },
    subject: {
        type: String
    }

}, { timestamps: true })

const course_model = mongoose.model("course", course_schema)

export default course_model
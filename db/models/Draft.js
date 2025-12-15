import mongoose from "mongoose";

const DrawingElementSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    tool: { type: String },
    type: { type: String },
    points: { type: mongoose.Schema.Types.Mixed },
    color: { type: String },
    strokeWidth: { type: Number },
    width: { type: Number },
    text: { type: String },
    fontSize: { type: Number },
    start: { type: mongoose.Schema.Types.Mixed },
    end: { type: mongoose.Schema.Types.Mixed },
    createdBy: { type: String },
  },
  { _id: false, strict: false }
);

const PageSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    elements: { type: [DrawingElementSchema], default: [] },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false, strict: false }
);

const DraftSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      default: "Untitled Draft",
    },
    ownerId: {
      type: String,
      required: true,
      index: true,
    },
    pages: {
      type: [PageSchema],
      default: [{ id: "page-1", elements: [], createdAt: new Date() }],
    },
    currentPageIndex: {
      type: Number,
      default: 0,
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
    collaborators: {
      type: [String],
      default: [],
    },
    thumbnail: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

DraftSchema.index({ ownerId: 1, updatedAt: -1 });
DraftSchema.index({ isPublic: 1 });

export const Draft = mongoose.model("Draft", DraftSchema);

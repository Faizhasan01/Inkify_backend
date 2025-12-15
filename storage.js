import crypto from "crypto";
import { Account, Draft } from "./db/models/index.js";
import { getMongoConnectionStatus } from "./db/mongodb.js";

class MemStorage {
  constructor() {
    this.users = new Map();
  }

  async getUser(id) {
    return this.users.get(id);
  }

  async getUserByUsername(username) {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }

  async createUser(insertUser) {
    const id = crypto.randomUUID();
    const user = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async createAccount(data) {
    if (!getMongoConnectionStatus()) {
      throw new Error("MongoDB not connected");
    }
    const account = new Account(data);
    return await account.save();
  }

  async getAccountByGoogleId(googleId) {
    if (!getMongoConnectionStatus()) {
      throw new Error("MongoDB not connected");
    }
    return await Account.findOne({ googleId });
  }

  async getAccountById(id) {
    if (!getMongoConnectionStatus()) {
      throw new Error("MongoDB not connected");
    }
    return await Account.findById(id);
  }

  async getAccountByEmail(email) {
    if (!getMongoConnectionStatus()) {
      throw new Error("MongoDB not connected");
    }
    return await Account.findOne({ email: email.toLowerCase() });
  }

  async getAccountByUsername(username) {
    if (!getMongoConnectionStatus()) {
      throw new Error("MongoDB not connected");
    }
    return await Account.findOne({ username });
  }

  async updateAccount(id, data) {
    if (!getMongoConnectionStatus()) {
      throw new Error("MongoDB not connected");
    }
    return await Account.findByIdAndUpdate(id, data, { new: true });
  }

  async deleteAccount(id) {
    if (!getMongoConnectionStatus()) {
      throw new Error("MongoDB not connected");
    }
    const result = await Account.findByIdAndDelete(id);
    return result !== null;
  }

  async setResetToken(email, token, expiry) {
    if (!getMongoConnectionStatus()) {
      throw new Error("MongoDB not connected");
    }
    return await Account.findOneAndUpdate(
      { email: email.toLowerCase() },
      { resetToken: token, resetTokenExpiry: expiry },
      { new: true }
    );
  }

  async getAccountByResetToken(token) {
    if (!getMongoConnectionStatus()) {
      throw new Error("MongoDB not connected");
    }
    return await Account.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: new Date() }
    });
  }

  async clearResetToken(id) {
    if (!getMongoConnectionStatus()) {
      throw new Error("MongoDB not connected");
    }
    return await Account.findByIdAndUpdate(
      id,
      { resetToken: null, resetTokenExpiry: null },
      { new: true }
    );
  }

  async createDraft(ownerId, title) {
    if (!getMongoConnectionStatus()) {
      throw new Error("MongoDB not connected");
    }
    const draft = new Draft({
      ownerId,
      title: title || "Untitled Draft",
      pages: [{ id: `page-${crypto.randomUUID()}`, elements: [], createdAt: new Date() }],
    });
    return await draft.save();
  }

  async getDraftById(id) {
    if (!getMongoConnectionStatus()) {
      throw new Error("MongoDB not connected");
    }
    return await Draft.findById(id);
  }

  async getDraftsByOwner(ownerId) {
    if (!getMongoConnectionStatus()) {
      throw new Error("MongoDB not connected");
    }
    return await Draft.find({ ownerId }).sort({ updatedAt: -1 });
  }

  async getDraftByOwnerAndTitle(ownerId, title) {
    if (!getMongoConnectionStatus()) {
      throw new Error("MongoDB not connected");
    }
    return await Draft.findOne({ ownerId, title });
  }

  async updateDraft(id, data) {
    if (!getMongoConnectionStatus()) {
      throw new Error("MongoDB not connected");
    }
    return await Draft.findByIdAndUpdate(id, data, { new: true });
  }

  async deleteDraft(id) {
    if (!getMongoConnectionStatus()) {
      throw new Error("MongoDB not connected");
    }
    const result = await Draft.findByIdAndDelete(id);
    return result !== null;
  }

  async addPageToDraft(draftId) {
    if (!getMongoConnectionStatus()) {
      throw new Error("MongoDB not connected");
    }
    const newPage = {
      id: `page-${crypto.randomUUID()}`,
      elements: [],
      createdAt: new Date(),
    };
    return await Draft.findByIdAndUpdate(
      draftId,
      { $push: { pages: newPage } },
      { new: true }
    );
  }

  async updateDraftPage(draftId, pageId, elements) {
    if (!getMongoConnectionStatus()) {
      throw new Error("MongoDB not connected");
    }
    return await Draft.findOneAndUpdate(
      { _id: draftId, "pages.id": pageId },
      { $set: { "pages.$.elements": elements } },
      { new: true }
    );
  }

  async updateDraftPages(draftId, pages) {
    if (!getMongoConnectionStatus()) {
      throw new Error("MongoDB not connected");
    }
    const formattedPages = pages.map((page) => ({
      id: page.id || `page-${crypto.randomUUID()}`,
      elements: page.elements || [],
      createdAt: new Date(),
    }));
    return await Draft.findByIdAndUpdate(
      draftId,
      { $set: { pages: formattedPages } },
      { new: true }
    );
  }

  async deletePageFromDraft(draftId, pageId) {
    if (!getMongoConnectionStatus()) {
      throw new Error("MongoDB not connected");
    }
    return await Draft.findByIdAndUpdate(
      draftId,
      { $pull: { pages: { id: pageId } } },
      { new: true }
    );
  }
}

export const storage = new MemStorage();

import { storage } from "../storage.js";
import { log } from "../utils/logger.js";

export async function createDraft(req, res) {
  try {
    const { title, pages, elements } = req.body;
    const ownerId = req.session.userId;
    
    const draftTitle = title || "Untitled Draft";
    
    const existingDraft = await storage.getDraftByOwnerAndTitle(ownerId, draftTitle);
    if (existingDraft) {
      return res.status(400).json({ error: "A draft with this name already exists. Please choose a different name." });
    }
    
    const draft = await storage.createDraft(ownerId, draftTitle);
    
    if (draft && pages && Array.isArray(pages)) {
      await storage.updateDraftPages(draft._id.toString(), pages);
    } else if (draft && elements) {
      const pageId = draft.pages[0]?.id;
      if (pageId) {
        await storage.updateDraftPage(draft._id.toString(), pageId, elements);
      }
    }
    
    const updatedDraft = await storage.getDraftById(draft._id.toString());
    res.status(201).json(updatedDraft);
  } catch (error) {
    log(`Error creating draft: ${error.message}`, "api");
    res.status(500).json({ error: "Failed to create draft" });
  }
}

export async function getDrafts(req, res) {
  try {
    const ownerId = req.session.userId;
    const drafts = await storage.getDraftsByOwner(ownerId);
    res.json(drafts);
  } catch (error) {
    log(`Error fetching drafts: ${error.message}`, "api");
    res.status(500).json({ error: "Failed to fetch drafts" });
  }
}

export async function getDraftById(req, res) {
  try {
    const { id } = req.params;
    const ownerId = req.session.userId;
    
    const draft = await storage.getDraftById(id);
    if (!draft) {
      return res.status(404).json({ error: "Draft not found" });
    }
    
    if (draft.ownerId !== ownerId) {
      return res.status(403).json({ error: "Access denied" });
    }
    
    res.json(draft);
  } catch (error) {
    log(`Error fetching draft: ${error.message}`, "api");
    res.status(500).json({ error: "Failed to fetch draft" });
  }
}

export async function updateDraft(req, res) {
  try {
    const { id } = req.params;
    const ownerId = req.session.userId;
    
    const draft = await storage.getDraftById(id);
    if (!draft) {
      return res.status(404).json({ error: "Draft not found" });
    }
    
    if (draft.ownerId !== ownerId) {
      return res.status(403).json({ error: "Access denied" });
    }
    
    const updateData = req.body;
    const updatedDraft = await storage.updateDraft(id, updateData);
    res.json(updatedDraft);
  } catch (error) {
    log(`Error updating draft: ${error.message}`, "api");
    res.status(500).json({ error: "Failed to update draft" });
  }
}

export async function deleteDraft(req, res) {
  try {
    const { id } = req.params;
    const ownerId = req.session.userId;
    
    const draft = await storage.getDraftById(id);
    if (!draft) {
      return res.status(404).json({ error: "Draft not found" });
    }
    
    if (draft.ownerId !== ownerId) {
      return res.status(403).json({ error: "Access denied" });
    }
    
    await storage.deleteDraft(id);
    res.json({ success: true });
  } catch (error) {
    log(`Error deleting draft: ${error.message}`, "api");
    res.status(500).json({ error: "Failed to delete draft" });
  }
}

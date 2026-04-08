// Templates Module - Handle template CRUD operations

// Preset templates (always available)
const PRESET_TEMPLATES = [
    {
        id: 'ieee',
        name: 'IEEE Academic',
        icon: '📄',
        isPreset: true,
        styles: {
            body: {
                fontFamily: 'Times New Roman',
                fontSize: 10,           // IEEE uses 10pt
                lineSpacing: 100,       // Single spacing
                alignment: 'JUSTIFIED',
                firstLineIndent: 9      // 0.125in ≈ 9pt
            },
            title: {
                fontFamily: 'Times New Roman',
                fontSize: 24,
                bold: true,
                alignment: 'CENTER',
                spaceBelow: 12
            },
            heading1: {
                fontFamily: 'Times New Roman',
                fontSize: 10,
                bold: false,
                smallCaps: true,
                alignment: 'START',
                spaceAbove: 12,
                spaceBelow: 6
            },
            heading2: {
                fontFamily: 'Times New Roman',
                fontSize: 10,
                italic: true,
                alignment: 'START',
                spaceAbove: 10,
                spaceBelow: 5
            }
        },
        layout: {
            margins: {
                top: 54,    // 0.75in × 72
                bottom: 72, // 1.0in × 72
                left: 45,   // 0.625in × 72
                right: 45   // 0.625in × 72
            }
        }
    },
    {
        id: 'corporate',
        name: 'Corporate Professional',
        icon: '💼',
        isPreset: true,
        styles: {
            body: { fontFamily: 'Times New Roman', fontSize: 11, lineSpacing: 115 }
        }
    },
    {
        id: 'apa',
        name: 'APA Style',
        icon: '📚',
        isPreset: true,
        styles: {
            body: { fontFamily: 'Times New Roman', fontSize: 12, lineSpacing: 200 }
        }
    },
    {
        id: 'mla',
        name: 'MLA Format',
        icon: '📝',
        isPreset: true,
        styles: {
            body: { fontFamily: 'Times New Roman', fontSize: 12, lineSpacing: 200 }
        }
    },
    {
        id: 'modern',
        name: 'Modern Clean',
        icon: '✨',
        isPreset: true,
        styles: {
            body: { fontFamily: 'Arial', fontSize: 11, lineSpacing: 115 }
        }
    }
];

// Local cache of user templates
let userTemplates = [];

// Get all preset templates
function getPresetTemplates() {
    return PRESET_TEMPLATES;
}

// Get user's custom templates from Firestore
async function getUserTemplates(userId) {
    if (!userId) return [];

    try {
        const snapshot = await firebase.firestore()
            .collection('templates')
            .where('ownerId', '==', userId)
            .orderBy('createdAt', 'desc')
            .get();

        userTemplates = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        return userTemplates;
    } catch (error) {
        console.error('Error fetching user templates:', error);
        return [];
    }
}

// Get all templates (preset + user)
async function getAllTemplates(userId) {
    const user = await getUserTemplates(userId);
    return [...PRESET_TEMPLATES, ...user];
}

// Get a single template by ID
async function getTemplate(templateId, userId) {
    // Check presets first
    const preset = PRESET_TEMPLATES.find(t => t.id === templateId);
    if (preset) return preset;

    // Check user templates
    if (userId) {
        const doc = await firebase.firestore()
            .collection('templates')
            .doc(templateId)
            .get();

        if (doc.exists && doc.data().ownerId === userId) {
            return { id: doc.id, ...doc.data() };
        }
    }

    return null;
}

// Create a new custom template
async function createTemplate(userId, templateData, userTier = 'free') {
    // Check template limits based on tier
    const limits = { free: 1, pro: 10, business: 100 };
    const maxTemplates = limits[userTier] || 1;

    const currentCount = userTemplates.length;
    if (currentCount >= maxTemplates) {
        throw new Error(`Template limit reached (${maxTemplates}). Upgrade to create more.`);
    }

    const template = {
        ...templateData,
        ownerId: userId,
        isPreset: false,
        isPublic: false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    const docRef = await firebase.firestore()
        .collection('templates')
        .add(template);

    return { id: docRef.id, ...template };
}

// Update an existing template
async function updateTemplate(templateId, userId, updates) {
    const docRef = firebase.firestore().collection('templates').doc(templateId);
    const doc = await docRef.get();

    if (!doc.exists || doc.data().ownerId !== userId) {
        throw new Error('Template not found or access denied');
    }

    await docRef.update({
        ...updates,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    return { id: templateId, ...doc.data(), ...updates };
}

// Delete a template
async function deleteTemplate(templateId, userId) {
    const docRef = firebase.firestore().collection('templates').doc(templateId);
    const doc = await docRef.get();

    if (!doc.exists || doc.data().ownerId !== userId) {
        throw new Error('Template not found or access denied');
    }

    await docRef.delete();
    return true;
}

// Export functions
export {
    PRESET_TEMPLATES,
    getPresetTemplates,
    getUserTemplates,
    getAllTemplates,
    getTemplate,
    createTemplate,
    updateTemplate,
    deleteTemplate
};

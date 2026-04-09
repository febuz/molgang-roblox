"use strict";
/**
 * MOLGANG-6.11: In-Game Shop System
 * Lemonsqueezy integration for payments
 * Cosmetic items ($1.99-$4.99)
 * Inventory management
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShopSystem = void 0;
class ShopSystem {
    constructor() {
        this.items = new Map();
        this.inventories = new Map();
        this.purchases = [];
        this.revenue = 0;
        this.initializeShop();
    }
    /**
     * Initialize shop with cosmetics
     */
    initializeShop() {
        const cosmetics = [
            // Skins
            {
                id: 'skin_abyssal',
                name: 'Abyssal Diver',
                type: 'skin',
                price: 3.99,
                rarity: 'epic',
                description: 'Deep sea explorer outfit',
                imageUrl: '/assets/skins/abyssal.png',
                category: 'skins',
                available: true,
                limitedTime: false
            },
            {
                id: 'skin_crystal',
                name: 'Crystal Geode',
                type: 'skin',
                price: 2.99,
                rarity: 'rare',
                description: 'Shimmering crystalline suit',
                imageUrl: '/assets/skins/crystal.png',
                category: 'skins',
                available: true,
                limitedTime: false
            },
            {
                id: 'skin_legend',
                name: 'Legendary Admiral',
                type: 'skin',
                price: 4.99,
                rarity: 'legendary',
                description: 'Exclusive legendary outfit (Limited)',
                imageUrl: '/assets/skins/legend.png',
                category: 'skins',
                available: true,
                limitedTime: true,
                endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            },
            // Emotes
            {
                id: 'emote_victory',
                name: 'Victory Dance',
                type: 'emote',
                price: 1.99,
                rarity: 'common',
                description: 'Celebratory dance move',
                imageUrl: '/assets/emotes/victory.gif',
                category: 'emotes',
                available: true,
                limitedTime: false
            },
            // Particle Effects
            {
                id: 'particle_gold',
                name: 'Golden Aura',
                type: 'particle',
                price: 2.99,
                rarity: 'rare',
                description: 'Golden particle effects around player',
                imageUrl: '/assets/particles/gold.png',
                category: 'particles',
                available: true,
                limitedTime: false
            }
        ];
        cosmetics.forEach(item => {
            this.items.set(item.id, item);
        });
    }
    /**
     * Get shop catalog
     */
    getCatalog(category) {
        const items = Array.from(this.items.values())
            .filter(item => !category || item.category === category)
            .filter(item => item.available)
            .filter(item => !item.limitedTime || (item.endsAt && item.endsAt > new Date()));
        return items;
    }
    /**
     * Purchase item
     */
    async purchaseItem(playerId, itemId, paymentToken) {
        const item = this.items.get(itemId);
        if (!item) {
            throw new Error(`Item ${itemId} not found`);
        }
        if (!item.available) {
            throw new Error(`Item ${itemId} is not available`);
        }
        // Initialize inventory if needed
        if (!this.inventories.has(playerId)) {
            this.inventories.set(playerId, {
                playerId,
                items: new Map(),
                equipped: {},
                balance: 0
            });
        }
        const purchase = {
            id: `purchase_${Date.now()}`,
            playerId,
            itemId,
            price: item.price,
            timestamp: new Date(),
            status: 'pending'
        };
        // Process payment via Lemonsqueezy (simulated)
        try {
            const transactionId = await this.processPayment(playerId, item.price, paymentToken);
            purchase.transactionId = transactionId;
            purchase.status = 'completed';
            // Add item to inventory
            const inventory = this.inventories.get(playerId);
            const currentCount = inventory.items.get(itemId) || 0;
            inventory.items.set(itemId, currentCount + 1);
            // Update revenue
            this.revenue += item.price;
            this.purchases.push(purchase);
            return purchase;
        }
        catch (error) {
            purchase.status = 'failed';
            this.purchases.push(purchase);
            throw error;
        }
    }
    /**
     * Process payment (Lemonsqueezy simulation)
     */
    async processPayment(playerId, amount, paymentToken) {
        // Simulated payment processing
        // In production: call actual Lemonsqueezy API
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve(`txn_${Date.now()}`);
            }, 100);
        });
    }
    /**
     * Get player inventory
     */
    getInventory(playerId) {
        return this.inventories.get(playerId) || null;
    }
    /**
     * Equip cosmetic
     */
    equipCosmetic(playerId, itemId, type) {
        const inventory = this.inventories.get(playerId);
        if (!inventory)
            return false;
        if (!inventory.items.has(itemId))
            return false;
        inventory.equipped[type] = itemId;
        return true;
    }
    /**
     * Get shop metrics
     */
    getMetrics() {
        return {
            total_items: this.items.size,
            available_items: Array.from(this.items.values()).filter(i => i.available).length,
            total_purchases: this.purchases.length,
            completed_purchases: this.purchases.filter(p => p.status === 'completed').length,
            total_revenue: this.revenue,
            average_price: this.items.size > 0
                ? Array.from(this.items.values()).reduce((sum, i) => sum + i.price, 0) / this.items.size
                : 0,
            players_with_purchases: new Set(this.purchases.map(p => p.playerId)).size
        };
    }
    /**
     * Get purchase history
     */
    getPurchaseHistory(playerId) {
        return this.purchases.filter(p => p.playerId === playerId);
    }
}
exports.ShopSystem = ShopSystem;
exports.default = ShopSystem;
//# sourceMappingURL=shop.js.map
/**
 * MOLGANG-6.11: In-Game Shop System
 * Lemonsqueezy integration for payments
 * Cosmetic items ($1.99-$4.99)
 * Inventory management
 */
interface ShopItem {
    id: string;
    name: string;
    type: 'skin' | 'emote' | 'particle' | 'trail';
    price: number;
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
    description: string;
    imageUrl: string;
    category: string;
    available: boolean;
    limitedTime: boolean;
    endsAt?: Date;
}
interface PlayerInventory {
    playerId: string;
    items: Map<string, number>;
    equipped: {
        skin?: string;
        emote?: string;
        particle?: string;
        trail?: string;
    };
    balance: number;
}
interface Purchase {
    id: string;
    playerId: string;
    itemId: string;
    price: number;
    timestamp: Date;
    status: 'pending' | 'completed' | 'failed';
    transactionId?: string;
}
export declare class ShopSystem {
    private items;
    private inventories;
    private purchases;
    private revenue;
    constructor();
    /**
     * Initialize shop with cosmetics
     */
    private initializeShop;
    /**
     * Get shop catalog
     */
    getCatalog(category?: string): ShopItem[];
    /**
     * Purchase item
     */
    purchaseItem(playerId: string, itemId: string, paymentToken: string): Promise<Purchase>;
    /**
     * Process payment (Lemonsqueezy simulation)
     */
    private processPayment;
    /**
     * Get player inventory
     */
    getInventory(playerId: string): PlayerInventory | null;
    /**
     * Equip cosmetic
     */
    equipCosmetic(playerId: string, itemId: string, type: 'skin' | 'emote' | 'particle' | 'trail'): boolean;
    /**
     * Get shop metrics
     */
    getMetrics(): {
        total_items: number;
        available_items: number;
        total_purchases: number;
        completed_purchases: number;
        total_revenue: number;
        average_price: number;
        players_with_purchases: number;
    };
    /**
     * Get purchase history
     */
    getPurchaseHistory(playerId: string): Purchase[];
}
export default ShopSystem;
//# sourceMappingURL=shop.d.ts.map
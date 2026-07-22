package ws

import (
	"encoding/json"
	"sync"
)

// Msg is a generic WebSocket envelope.
type Msg struct {
	Type    string          `json:"type"`
	Payload json.RawMessage `json:"payload"`
}

// Hub manages all connected WebSocket clients and fan-out broadcasts.
type Hub struct {
	mu        sync.RWMutex
	clients   map[string]*Client // playerID -> client
	broadcast chan []byte
	register  chan *Client
	unregister chan *Client
}

func NewHub() *Hub {
	return &Hub{
		clients:    make(map[string]*Client),
		broadcast:  make(chan []byte, 256),
		register:   make(chan *Client, 32),
		unregister: make(chan *Client, 32),
	}
}

// Run processes register/unregister/broadcast events. Call in a goroutine.
func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client.PlayerID] = client
			h.mu.Unlock()

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client.PlayerID]; ok {
				delete(h.clients, client.PlayerID)
				close(client.send)
			}
			h.mu.Unlock()

		case msg := <-h.broadcast:
			h.mu.RLock()
			for _, client := range h.clients {
				select {
				case client.send <- msg:
				default:
					// slow client: drop
				}
			}
			h.mu.RUnlock()
		}
	}
}

// Broadcast sends a typed message to all connected clients.
func (h *Hub) Broadcast(msgType string, payload any) {
	raw, err := json.Marshal(payload)
	if err != nil {
		return
	}
	msg := Msg{Type: msgType, Payload: raw}
	data, err := json.Marshal(msg)
	if err != nil {
		return
	}
	h.broadcast <- data
}

// Send delivers a message to a specific player.
func (h *Hub) Send(playerID, msgType string, payload any) {
	h.mu.RLock()
	client, ok := h.clients[playerID]
	h.mu.RUnlock()
	if !ok {
		return
	}
	raw, err := json.Marshal(payload)
	if err != nil {
		return
	}
	msg := Msg{Type: msgType, Payload: raw}
	data, err := json.Marshal(msg)
	if err != nil {
		return
	}
	select {
	case client.send <- data:
	default:
	}
}

// Register makes a client known to the hub.
func (h *Hub) Register(c *Client) {
	h.register <- c
}

// Unregister removes a client from the hub.
func (h *Hub) Unregister(c *Client) {
	h.unregister <- c
}

// Connected returns a list of connected player IDs.
func (h *Hub) Connected() []string {
	h.mu.RLock()
	defer h.mu.RUnlock()
	ids := make([]string, 0, len(h.clients))
	for id := range h.clients {
		ids = append(ids, id)
	}
	return ids
}

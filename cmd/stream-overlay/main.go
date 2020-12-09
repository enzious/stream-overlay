package main

import (
	"encoding/json"
	"io/ioutil"
	"flag"
	"log"
	"net/http"
	"os"

	rgb "github.com/foresthoffman/rgblog"
)

func main() {
	configFileStr := flag.String("config", "oauth.json", "config file path")
	flag.Parse()

	config, err := readConfig(*configFileStr)
	if err != nil {
		rgb.RPrintf("[%s] Failed to read config file %s: %v.\n", TimeStampStr(), *configFileStr, err)
		os.Exit(1)
	}

	hub := newHub()
	go hub.run()

	var bb BasicBot
	bb.Channel = config.TwitchChannelName
	bb.Name = config.TwitchBotName
	bb.Server = "irc.chat.twitch.tv"
	bb.Port = "6667"
	bb.OAuthPassword = config.TwitchPassword
	go bb.Start(hub)

	http.HandleFunc("/ws/", func(w http.ResponseWriter, r *http.Request) {
		serveWs(hub, w, r)
	})

	http.HandleFunc("/api/emotes", func(w http.ResponseWriter, r *http.Request) {
		resp, err := http.Get("https://api.twitch.tv/kraken/chat/emoticon_images?api_version=5" +
			"&client_id=" + config.TwitchPassword +
			"&callback=setEmotes")
		if err != nil {
			return
		}

		defer resp.Body.Close()
		body, err := ioutil.ReadAll(resp.Body)

		w.Write(body)
	})

	http.HandleFunc("/api/chat.clear", func(w http.ResponseWriter, r *http.Request) {
		message, _ := json.Marshal(&ClearChatEvent {
			Type: "chat.clear",
		})
		hub.broadcast <- message
		w.WriteHeader(200)
	})

	rgb.YPrintf("[%s] Listening for requests at http://localhost:8884/.\n", TimeStampStr())
	log.Fatal(http.ListenAndServe(":8884", nil))
}

type ClearChatEvent struct {
	Type        string `json:"type,omitempty"`
}
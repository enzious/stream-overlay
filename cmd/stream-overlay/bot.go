package main

/**
 * bot.go
 *
 * Copyright (c) 2017 Forest Hoffman. All Rights Reserved.
 * License: MIT License (see the included LICENSE file)
 */

import (
	"bufio"
	"encoding/json"
	"errors"
	"fmt"
	"net"
	"net/textproto"
	"regexp"
	"strings"
	"time"

	rgb "github.com/foresthoffman/rgblog"
)

const PSTFormat = "Jan 2 15:04:05 PST"

// Regex for parsing PRIVMSG strings.
//
// First matched group is the user's name and the second matched group is the content of the
// user's message.
var MsgRegex *regexp.Regexp = regexp.MustCompile(`@([^ ]+) :(\w+)!\w+@\w+\.tmi\.twitch\.tv (PRIVMSG) #\w+(?: :(.*))?$`)

// Regex for parsing user commands, from already parsed PRIVMSG strings.
//
// First matched group is the command name and the second matched group is the argument for the
// command.
var CmdRegex *regexp.Regexp = regexp.MustCompile(`^!(\w+)\s?(\w+)?`)

type WsEvent struct {
	Type        string `json:"type,omitempty"`
	From        string `json:"from,omitempty"`
	DisplayName string `json:"displayName,omitempty"`
	Color       string `json:"color,omitempty"`
	Body        string `json:"body,omitempty"`
	Tts         bool   `json:"tts,omitempty"`
}

func newWsEventMessage(from string, body string, tagMap map[string]string) ([]byte, error) {
	emp := &WsEvent{
		Type:        "message",
		From:        from,
		Body:        body,
		Color:       tagMap["color"],
		DisplayName: tagMap["display-name"],
		Tts:         tagMap["tts"] == "true",
	}
	return json.Marshal(emp)
}

type Bot interface {

	// Opens a connection to the Twitch.tv IRC chat server.
	Connect()

	// Closes a connection to the Twitch.tv IRC chat server.
	Disconnect()

	// Listens to chat messages and PING request from the IRC server.
	HandleChat() error

	// Joins a specific chat channel.
	JoinChannel()

	// Parses credentials needed for authentication.
	ReadCredentials() error

	// Sends a message to the connected channel.
	Say(msg string) error

	// Attempts to keep the bot connected and handling chat.
	Start()
}

type BasicBot struct {

	// The channel that the bot is supposed to join. Note: The name MUST be lowercase, regardless
	// of how the username is displayed on Twitch.tv.
	Channel string

	// A reference to the bot's connection to the server.
	conn net.Conn

	// // The credentials necessary for authentication.
	// Credentials *OAuthCred
	OAuthPassword string

	// A forced delay between bot responses. This prevents the bot from breaking the message limit
	// rules. A 20/30 millisecond delay is enough for a non-modded bot. If you decrease the delay
	// make sure you're still within the limit!
	//
	// Message Rate Guidelines: https://dev.twitch.tv/docs/irc#irc-command-and-message-limits
	MsgRate time.Duration

	// The name that the bot will use in the chat that it's attempting to join.
	Name string

	// The port of the IRC server.
	Port string

	// The domain of the IRC server.
	Server string

	// The time at which the bot achieved a connection to the server.
	startTime time.Time
}

// Connects the bot to the Twitch IRC server. The bot will continue to try to connect until it
// succeeds or is forcefully shutdown.
func (bb *BasicBot) Connect() {
	var err error
	rgb.YPrintf("[%s] Connecting to %s...\n", TimeStampStr(), bb.Server)

	// makes connection to Twitch IRC server
	bb.conn, err = net.Dial("tcp", bb.Server+":"+bb.Port)
	if nil != err {
		rgb.YPrintf("[%s] Cannot connect to %s, retrying.\n", TimeStampStr(), bb.Server)
		bb.Connect()
		return
	}
	rgb.YPrintf("[%s] Connected to %s!\n", TimeStampStr(), bb.Server)
	bb.startTime = time.Now()
}

// Officially disconnects the bot from the Twitch IRC server.
func (bb *BasicBot) Disconnect() {
	bb.conn.Close()
	upTime := time.Now().Sub(bb.startTime).Seconds()
	rgb.YPrintf("[%s] Closed connection from %s! | Live for: %fs\n", TimeStampStr(), bb.Server, upTime)
}

// Listens for and logs messages from chat. Responds to commands from the channel owner. The bot
// continues until it gets disconnected, told to shutdown, or forcefully shutdown.
func (bb *BasicBot) HandleChat(hub *Hub) error {
	rgb.YPrintf("[%s] Watching #%s...\n", TimeStampStr(), bb.Channel)

	// reads from connection
	tp := textproto.NewReader(bufio.NewReader(bb.conn))

	// listens for chat messages
	for {
		line, err := tp.ReadLine()
		if nil != err {

			// officially disconnects the bot from the server
			bb.Disconnect()

			fmt.Println("Failed to read line from channel", err)

			return errors.New("bb.Bot.HandleChat: Failed to read line from channel. Disconnected.")
		}

		// logs the response from the IRC server
		// rgb.YPrintf("[%s] %s\n", TimeStampStr(), line)

		// hub.broadcast <- []byte(line)

		if "PING :tmi.twitch.tv" == line {

			// respond to PING message with a PONG message, to maintain the connection
			bb.conn.Write([]byte("PONG :tmi.twitch.tv\r\n"))
			continue
		} else {

			// handle a PRIVMSG message
			matches := MsgRegex.FindStringSubmatch(line)
			if nil != matches {
				tagsStr := matches[1]
				tags := strings.Split(tagsStr, ";")

				tagMap := make(map[string]string)
				for _, tagStr := range tags {
					tag := strings.Split(tagStr, "=")
					tagMap[tag[0]] = tag[1]
				}

				userName := matches[2]
				msgType := matches[3]

				switch msgType {
				case "PRIVMSG":
					rgb.YPrintf("[%s] %s\n", TimeStampStr(), line)

					msg := matches[4]
					rgb.GPrintf("[%s] %s: %s\n", TimeStampStr(), userName, msg)

					if tagMap["custom-reward-id"] == "a7ace681-902f-4374-903c-5a76fa41de36" {
						tagMap["tts"] = "true"
					}

					wsMsg, err := newWsEventMessage(userName, msg, tagMap)
					if err == nil {
						hub.broadcast <- wsMsg
					}

					// parse commands from user message
					cmdMatches := CmdRegex.FindStringSubmatch(msg)
					if nil != cmdMatches {
						cmd := cmdMatches[1]

						// channel-owner specific commands
						if userName == bb.Channel {
							switch cmd {
							case "tbdown":
								rgb.CPrintf(
									"[%s] Shutdown command received. Shutting down now...\n",
									TimeStampStr(),
								)

								bb.Disconnect()
								return nil
							default:
								// do nothing
							}
						}
					}
				default:
					// do nothing
				}
			}
		}
		time.Sleep(bb.MsgRate)
	}
}

// Makes the bot join its pre-specified channel.
func (bb *BasicBot) JoinChannel() {
	rgb.YPrintf("[%s] Joining #%s...\n", TimeStampStr(), bb.Channel)

	bb.conn.Write([]byte(fmt.Sprintf("PASS oauth:%s\r\n", bb.OAuthPassword)))
	bb.conn.Write([]byte(fmt.Sprintf("NICK %s\r\n", bb.Name)))
	bb.conn.Write([]byte(fmt.Sprintf("USER %s 8 * :%s\r\n", bb.Name, bb.Name)))
	bb.conn.Write([]byte(fmt.Sprintf("JOIN #%s\r\n", bb.Channel)))
}

// Makes the bot send a message to the chat channel.
func (bb *BasicBot) Say(msg string) error {
	if "" == msg {
		return errors.New("BasicBot.Say: msg was empty.")
	}

	// check if message is too large for IRC
	if len(msg) > 512 {
		return errors.New("BasicBot.Say: msg exceeded 512 bytes")
	}

	_, err := bb.conn.Write([]byte(fmt.Sprintf("PRIVMSG #%s :%s\r\n", bb.Channel, msg)))
	if nil != err {
		return err
	}
	return nil
}

// Makes the bot send a message to the chat channel.
func (bb *BasicBot) RequestTags() error {
	_, err := bb.conn.Write([]byte(fmt.Sprintf("CAP REQ :twitch.tv/tags\r\n")))
	if nil != err {
		return err
	}
	return nil
}

// Starts a loop where the bot will attempt to connect to the Twitch IRC server, then connect to the
// pre-specified channel, and then handle the chat. It will attempt to reconnect until it is told to
// shut down, or is forcefully shutdown.
func (bb *BasicBot) Start(hub *Hub) {
	for {
		bb.Connect()
		bb.JoinChannel()
		bb.RequestTags()
		err := bb.HandleChat(hub)
		if nil != err {

			// attempts to reconnect upon unexpected chat error
			time.Sleep(1000 * time.Millisecond)
			fmt.Println(err)
			fmt.Println("Starting bot again...")
		} else {
			return
		}
	}
}

func TimeStampStr() string {
	return TimeStamp(PSTFormat)
}

func TimeStamp(format string) string {
	return time.Now().Format(format)
}

package main

import (
	"encoding/json"
	"io"
	"io/ioutil"

	rgb "github.com/foresthoffman/rgblog"
)

type AppConfig struct {
	// The bot account's OAuth password.
	TwitchPassword string `json:"twitch_password,omitempty"`

	// The developer application client ID. Used for API calls to Twitch.
	TwitchClientID string `json:"twitch_client_id,omitempty"`

	TwitchBotName string `json:"twitch_bot_name,omitempty"`

	TwitchChannelName string `json:"twitch_channel_name,omitempty"`
}

func readConfig(configFileStr string) (*AppConfig, error) {
	var appConfig AppConfig

	file, err := ioutil.ReadFile(configFileStr)
	if nil != err && io.EOF != err {
		return nil, err
	}

	err = json.Unmarshal([]byte(file), &appConfig)
	if nil != err && io.EOF != err {
		rgb.RPrintf("[%s] Failed to decode config file.\n", TimeStampStr())
		return nil, err
	}

	return &appConfig, nil
}
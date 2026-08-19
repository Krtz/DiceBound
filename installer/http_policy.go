//go:build windows

package main

import (
	"net"
	"net/http"
	"time"
)

// The launcher downloads game builds that are well over 100 MB. A 30-second
// whole-request timeout is appropriate for neither slow connections nor large
// release assets. Keep connection/setup failures fast, but give an active game
// download enough time to finish.
func init() {
	client.Timeout = 30 * time.Minute
	client.Transport = &http.Transport{
		Proxy:                 http.ProxyFromEnvironment,
		DialContext:           (&net.Dialer{Timeout: 15 * time.Second, KeepAlive: 30 * time.Second}).DialContext,
		ForceAttemptHTTP2:     true,
		MaxIdleConns:          10,
		IdleConnTimeout:       90 * time.Second,
		TLSHandshakeTimeout:   15 * time.Second,
		ResponseHeaderTimeout: 20 * time.Second,
		ExpectContinueTimeout: 1 * time.Second,
	}
}

<?php

// ATTN: Modify settings
$url = $_GET["url"]?urldecode($_GET["url"]):"";

error_reporting(E_ALL ^ E_DEPRECATED);

function get_view_source($url) {
	$ch = curl_init();
	$timeout = 5;
	curl_setopt($ch, CURLOPT_URL, $url);
	curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
	curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, $timeout);
	$data = curl_exec($ch);
	curl_close($ch);
	return $data;
} // get_view_source

if(strlen($url)) {
	$code = get_view_source($url);
	echo $code;
}

?>
let settings = {
    betweenQueue: 20
}

$(()=>{

    // onload check if we want a particular URL inputted
    (function checkURLSearchParamURL(){
        let searchParam = new URLSearchParams(window.location.search);
        let url = searchParam.get("url");
        if(url) {
            $("#enter-url").val(url);
            setTimeout(()=>{
                $("#preview").click();
            }, 1100)
        }
    })();

    // onload check browser supports web speech API
    (function checkBrowserSpeechSupport() {
        let isSupported = Boolean("speechSynthesis" in window);
        if(!isSupported) {
            alert("Error: Your browser does not support Web Speech API. Try updating your web browser or changing web browser.")
        }
    })();

    // Fix speech cutting bug
    (function fixBrowserBugCuttingSpeech() {
        // Known bug in Chrome where speech is cut between 200-300 characters. Then the code will think it's still speaking, so it never knows to go to the next text portion in the queue
        // The easiest workaround is to pause and resume reasonably before those characters are reached.
        // Chrome has not prioritized to fix this bug for years.
        // Source: https://stackoverflow.com/questions/21947730/chrome-speech-synthesis-with-longer-texts
        setInterval(() => { 
            speechSynthesis.pause(); 
            speechSynthesis.resume(); 
        }, 5000);
    })();

    // Tip animation
    (function animateTips() {
        let $tips = $("#tips");
        let tips = [
            "On mobile? Make sure not muted.",
            "You can enter text into the preview.",
            "After a webpage is loaded into preview, you can still modify the text."
        ];
        activeTap=-1;

        setInterval(()=>{
            console.log(activeTap);
            if(activeTap===tips.length-1) {
                activeTap = 0;
            } else {
                activeTap++;
            }

            $tips.fadeOut(2000, ()=>{ $tips.html(tips[activeTap]); })
            $tips.fadeIn(2000);
        }, 6000);
    })();

    // Estimate reading time by checking if a textnode. If not, recursively checks for all textnodes in descendents.
    // Dividing the number of textnodes by some reasonable factor will get you the estimated reading time.
    // The estimated reading time may be a little off depending on the length of the average word and the speed of
    // the voice on the user's device.
    window.getWebpageEstimatedReadingTime = function() {
        var textContainer = "#webpage-text #previewed";

        return (function getEstimatedTime(textContainer) {
            function getTextNodesIn(element) {
                var wordcount = 0,
                    whitespace = /^s*$/;

                function getTextNode(node) {
                    // type 3 is a textnode
                    if (node.nodeType == 3) {
                        // We skip text nodes that are only whitespaces
                        if (!whitespace.test(node.nodeValue)) {
                            wordcount += node.nodeValue.split(" ").length;
                        }
                    // if this isn't a text node, recursively test each childnode
                    } else {
                        for (var i = 0, len = node.childNodes.length; i < len; ++i) {
                            getTextNode(node.childNodes[i]);
                        }
                    }
                }
            
                getTextNode(element);
                return wordcount;
            }
            
            // Estimated reading time factor 165-250
            return (getTextNodesIn(textContainer) / 165).toFixed(2); // in minutes
        }(document.querySelector(textContainer)));

    } // estimateReadingTime

    // Handle keyup's on where user enters URL
    // Pressing "Enter" on URL input -> Clicks preview button for user
    // Pressing any key will reset the estimated reading time text
    $("#enter-url").on("keyup", (event)=> {
        if (event.keyCode === 13) {
            $("#preview").click();
        }

        $("#estimated-reading-time").text("");
    })

    // Pressing preview button will download the webpage to the preview component
    $("#preview").on("click", ()=>{
        const url = $("#enter-url").val();
        if(url.length===0) {
            alert("What's the webpage you want me to read?\nPlease enter the full URL starting with https://www.");
            return;
        };

        $.get("./php/viewer.php?url=" + url).done(viewsource => {
            let regex = new RegExp("\s", "g");
            if(viewsource.replace(regex, "").length===0)
                alert("URL doesn't look right.\nPlease make sure full URL beginning with https://www.");
            else {

                let $domAPI = $("<div/>");

                // Set unclean view source
                $domAPI.html(viewsource);
                // Remove these mostly nonvisual elements (img is visual, and script could be visual if it modifies the DOM or causes animations)
                $domAPI.find("title, head, meta, link, style, script, noscript, img, data").remove();

                // Remove empty text elements, theoretically except those which contains other elements containing text
                $domAPI.find("*:empty").remove();

                viewsource = $domAPI.html();

                // Add newlines where it may be appropriate, to encourage pausing during speaking
                viewsource = viewsource.replace(/<!--[\s\S]*?-->/g, "");
                viewsource = viewsource.replace(/<\/div>/g, ".\n</div>");
                viewsource = viewsource.replace(/<\/p>/g, ".\n</p>");
                viewsource = viewsource.replace(/<\/br>/g, "\n</br>");
                viewsource = viewsource.replace(/<\/main>/g, ".\n</main>");
                viewsource = viewsource.replace(/<\/article>/g, ".\n</article>");
                viewsource = viewsource.replace(/\n{2,}/g, ".\n");

                // $wrapper.text($wrapper.text());
                // $wrapper.text($wrapper.text().replace(/\n{2,}/g, '\n'));
                $("#webpage-text #previewed").html(viewsource);

                // Set url parameter
                let searchParams = new URLSearchParams("");
                searchParams.set("url", url);
                let searchParamsStr = searchParams.toString();
                history.pushState({}, "", "?" + searchParamsStr);

                // Automatically match cleaning profile
                $("#clean-profiles li").each((i,li)=>{ 
                    if(!li.dataset.domain) return true; 
                    
                    let domain = li.dataset.domain.toLowerCase(); 
                    let isMatchesUrl = $("#enter-url").val().toLowerCase().indexOf(domain)>-1; 
                    
                    // console.table({isMatchesUrl, domain}); 
                    if(isMatchesUrl) $(li).click(); 
                });

                // Indicate estimated reading time
                $("#estimated-reading-time").text(`${getWebpageEstimatedReadingTime()} mins`);

            } // else
        });
    }); // prevew on click

    // Select a cleaning profile to make the preview look more readable to the human eyes
    $("#clean-profiles li").on("click", (event)=>{
        event.stopPropagation();
        event.preventDefault();

        function executeCleanScript(scriptFile) {
            $.get(`profiles/${scriptFile}.js`).done(scriptCode=>{
                // jquery runs js files that are get
                // let scriptEl = document.createElement("script");
                // scriptEl.innerText = scriptCode;
                // document.querySelector("body").append(scriptEl);
            }).fail(()=>{
                alert("Error: Cleaning profile doesn't exist. Please let webmaster know.");
            });

        }
        let cleanPreset = event.target.innerText;
        let $webpageText = $("#webpage-text");
        switch(cleanPreset) {
            case "Wikipedia":
                $("#clean-profiles-selected").text("Wikipedia");
                executeCleanScript("wikipedia");
                break;
            case "sci-fit.net":
                $("#clean-profiles-selected").text("sci-fit.net");
                break;
            case "Request clean preset":
                window.open("mailto: weffung@ucdavis.edu");
                break;
        }
    }); // $("#clean-profiles li").on("click"

    // Read button will extract text from the preview and read it
    $("#read").on("click", ()=>{
        // Is there reading queues in DOM form to be made out of the previewed / cleaned preview?
        if($("#webpage-text").text().length===0) return false;

        // Remove old reading queues in DOM form
        // - get text and remove redundant double/triple lines and pausing periods as much as possible
        $("#webpage-text .queued").remove();

        // Add reading queues in DOM form from the previewed / cleaned preview
        // - The maximum length of the text that can be spoken in each utterance is 32767
        let text = $("#webpage-text #previewed").text();
        text = text.replaceAll(/(\n\t){2,}/gm, "\n\t")
                    .replaceAll(/(\n\t\t){2,}/gm, "\n\t\t")
                    .replaceAll(/\n{2,}/gm, "\n").replaceAll(/(\n\.){2,}/gm, "\n.")
                    .replaceAll(/^\.\n/mg, "\n");
        let arrayWords = Array.from(text.matchAll(/[\w\n\t\.!\?,:;]+/g)).map(el=>el[0]);

        window.aQueueText = "";
        window.charLimit=32757; // Remove ~10 characters for room for the last word to be added
        arrayWords.forEach((word,i)=>{
            if(i<arrayWords.length-1 && aQueueText.length + word.length < charLimit) {
                aQueueText+=word + " ";
            } else {
                aQueueText+=word + " ";
                let $newQueue = $("<div/>").addClass("queued").attr("contenteditable", true).text(aQueueText);
                $("#webpage-text").append($newQueue);
                aQueueText = "";
            }
        });

        // Speak each part of the queue and highlight them on the DOM too
        window.$readingQueue = $("#webpage-text .queued");
        window.activeAt = -1;
        window.started = false;
        window.synth = window.speechSynthesis;
        window.activePoll = setInterval(()=>{;
            window.isSpeaking = false;
            if(!started) {
                isSpeaking = false;
                started = true;
            } else {
                isSpeaking = synth.speaking;
            }
            // console.log("Is at queue:" + activeAt);
            // console.log("Is reading? " + isSpeaking);

            if(!isSpeaking) {
                activeAt++;
                if(activeAt >= $readingQueue.length) {
                    $("#webpage-text .queued.active").removeClass("active");
                    clearInterval(activePoll);
                } else {
                    $("#webpage-text .queued.active").removeClass("active");
                    let $currentPortion = $readingQueue.eq(activeAt);
                    $currentPortion.addClass("active")
                    window.currentPortionText = $currentPortion.text();
                    currentPortionText = currentPortionText.trim() + ".";
                    currentPortionText = currentPortionText.replaceAll(/[\t]/gm, "").replaceAll(/\s{2,}/gm, " ").replaceAll(/\n/gm, ".");
                    synth.speak(new SpeechSynthesisUtterance(currentPortionText));
                }
            }
        }, settings.betweenQueue);
        
    }); // read on click

});
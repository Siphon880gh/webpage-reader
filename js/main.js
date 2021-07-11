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
    (function checkBrowserSpeechSupport() {
        let isSupported = Boolean("speechSynthesis" in window);
        if(!isSupported) {
            alert("Error: Your browser does not support Web Speech API. Try updating your web browser or changing web browser.")
        }
    })();
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

    $("#enter-url").on("keyup", (event)=> {
        if (event.keyCode === 13) {
            $("#preview").click();
        }
    })

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

                $("#clean-profiles li").each((i,li)=>{ 
                    if(!li.dataset.domain) return true; 
                    
                    let domain = li.dataset.domain.toLowerCase(); 
                    let isMatchesUrl = $("#enter-url").val().toLowerCase().indexOf(domain)>-1; 
                    
                    // console.table({isMatchesUrl, domain}); 
                    if(isMatchesUrl) $(li).click(); 
                });

            } // else
        });
    });

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

    $("#read").on("click", ()=>{
        // Is there reading queues in DOM form to be made out of the previewed / cleaned preview?
        if($("#webpage-text").text().length===0) return false;

        // Remove old reading queues in DOM form
        // - get text and remove redundant double/triple lines and pausing periods as much as possible
        $("#webpage-text .queued").remove();

        // Add reading queues in DOM form from the previewed / cleaned preview
        // - The maximum length of the text that can be spoken in each utterance is 32767
        // - Actually, articulate js 2 looks like it has a smaller text maximum length
        let text = $("#webpage-text #previewed").text();
        text = text.replaceAll(/(\n\t){2,}/gm, "\n\t")
                    .replaceAll(/(\n\t\t){2,}/gm, "\n\t\t")
                    .replaceAll(/\n{2,}/gm, "\n").replaceAll(/(\n\.){2,}/gm, "\n.")
                    .replaceAll(/^\.\n/mg, "\n");
        let arrayWords = Array.from(text.matchAll(/[\w\n\t\.!\?,:;]+/g)).map(el=>el[0]);

        window.aQueueText = "";
        window.charLimit=32766; // 245 // 319
        arrayWords.forEach((word,i)=>{
            if(i<arrayWords.length-1 && aQueueText.length + word.length < charLimit) {
                aQueueText+=word + " ";
            } else {
                // let $newQueue = $("<div/>").addClass("queued").attr("contenteditable", true).text(`Autodetect and select the clean profile based on URL. Refactored: View id's; UX: Numbered controls. UX: Validation messages at URL input; Feature: onload the URL search param URL and preview the page. Runs clean profile.`);
                let $newQueue = $("<div/>").addClass("queued").attr("contenteditable", true).text(aQueueText);
                $("#webpage-text").append($newQueue);
                aQueueText = "";
                aQueueText+=word + " ";
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
        
    });

});
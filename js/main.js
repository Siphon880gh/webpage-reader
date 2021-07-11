let settings = {
    betweenQueue: 300
}

$(()=>{

    // onload check if we want a particular URL inputted
    (function checkIfURLSearchParamURL(){
        let searchParam = new URLSearchParams(window.location.search);
        let url = searchParam.get("url");
        if(url) {
            $("#enter-url").val(url);
            setTimeout(()=>{
                $("#preview").click();
            }, 1100)
        }
    })();
    (function checkBrowserSupport() {
        let isSupported = $().articulate('enabled');
        if(!isSupported) {
            alert("Error: Your browser does not support Web Speech API. Try updating your web browser or changing web browser.")
        }
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
        let text = $("#webpage-text #previewed").text();
        text = text.replaceAll(/(\n\t){2,}/gm, "\n\t").replaceAll(/(\n\t\t){2,}/gm, "\n\t\t").replaceAll(/\n{2,}/gm, "\n").replaceAll(/(\n\.){2,}/gm, "\n.");

        // $("#webpage-text .queued").remove();

        // Add reading queues in DOM form from the previewed / cleaned preview
        // ...

        let $readingQueue = $("#webpage-text .queued").toArray();
        let activeAt = -1;

        // Articulate js does not support events to detect when a reading finished for invoking a callback.
        // But it does support a method that returns the state of articulate, speaking or not (Note, paused is considered still speaking)
        let activePoll = setInterval(()=>{
            let isSpeaking = $().articulate('isSpeaking');
            if(!isSpeaking) {
                activeAt++;
                if(activeAt >= $readingQueue.length) {
                    $("#webpage-text .queued.active").removeClass("active");
                    clearInterval(activePoll);
                } else {
                    $("#webpage-text .queued.active").removeClass("active");
                    $($readingQueue[activeAt]).addClass("active").articulate("speak");
                }
            }
        }, settings.betweenQueue); 
        
    });

});
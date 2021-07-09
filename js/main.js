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
                // Set unclean view source
                $("#webpage-text").html(viewsource);

                // Set url parameter
                let searchParams = new URLSearchParams("");
                searchParams.set("url", url);
                let searchParamsStr = searchParams.toString();
                history.pushState({}, "", "?" + searchParamsStr);

                $("#clean-profiles li").each((i,li)=>{ 
                    if(!li.dataset.domain) return true; 
                    
                    let domain = li.dataset.domain.toLowerCase(); 
                    let isMatchesUrl = $("#enter-url").val().toLowerCase().indexOf(domain)>-1; 
                    
                    console.table({isMatchesUrl, domain}); 
                    
                    if(isMatchesUrl) $(li).click(); 
                });

            } // else
        });
    });

    $("#read").on("click", ()=>{
        $("#webpage-text").articulate('speak');
    });

    $("#clean-profiles li").on("click", (event)=>{
        event.stopPropagation();
        event.preventDefault();

        function executeCleanScript(scriptFile) {
            $.get(`profiles/${scriptFile}.js`).done(scriptCode=>{
                // jQuery seems to run the js file when it gets.
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
    });

});
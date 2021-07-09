$(()=>{

    // onload check if we want a particular URL inputted
    (function checkIfURLSearchParamURL(){
        let searchParam = new URLSearchParams(window.location.search);
        let url = searchParam.get("url");
        if(url) {
            $("#enter-url").val(url);
        }
    })();

    $("#enter-url").on("keyup", (event)=> {
        if (event.keyCode === 13) {
            $("#download").click();
        }
    })

    $("#download").on("click", ()=>{
        const url = $("#enter-url").val();
        if(url.length===0) return;

        $.get("./php/viewer.php?url=" + url).done(viewsource => {
            let regex = new RegExp("/w", "g");
            if(viewsource.replace(regex, "").length===0)
                alert("Please check URL. Make sure full URL beginning with https://www.");
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
        let cleanPreset = event.target.innerText;
        let $webpageText = $("#webpage-text");
        switch(cleanPreset) {
            case "Wikipedia":
                $("#clean-profiles-selected").text("Wikipedia");
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
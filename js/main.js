$(()=>{
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
            } // else
        });
    });

    $("#read").on("click", ()=>{
        $("#webpage-text").articulate('speak');
    });

    $(".dropdown-menu").on("click", "li", (event)=>{
        let cleanPreset = event.target.innerHTML;
        let $webpageText = $("#webpage-text");
        switch(cleanPreset) {
            case "Wikipedia":
                break;
            case "sci-fit.net":
                break;
        }
    });

});
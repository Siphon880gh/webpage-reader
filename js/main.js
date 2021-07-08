$(()=>{
    $("#download").on("click", ()=>{
        const url = $("#enter-url").val();
        if(url.length===0) return;

        $.get("./php/viewer.php?url=" + url).done(viewsource => {
            let regex = new RegExp("/w", "g");
            if(viewsource.replace(regex, "").length===0)
                alert("Please check URL. Make sure full URL beginning with https://www.");
            else
                $("#webpage-text").html(viewsource);
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
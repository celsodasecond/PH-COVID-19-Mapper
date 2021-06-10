var map;
var removeMode = false;
var addMode = false;
var counter = 0; //will serve as id for newly created markers
var addMarkerEvent;
var messageStyle = document.getElementById("message");
var polygonArray = [];

// dapat itong mga variable na ito ay kunin from some storage:
var myLatLng = { lat: 14.697580, lng: 121.089948};
var myZoom = 18;
var patientLocations = [
    {id: 1, lat: 14.697017, lng: 121.088796},
    {id: 2, lat: 14.697387, lng: 121.088833},
    {id: 3, lat: 14.697466, lng: 121.089262},
    {id: 4, lat: 14.696853, lng: 121.089793},
    {id: 5, lat: 14.697095, lng: 121.088123},
    {id: 6, lat: 14.69758, lng: 121.089948},
    {id: 7, lat: 14.696770995311615, lng: 121.0894509851164},
    {id: 8, lat: 14.696453261995734, lng: 121.0892525843236},
    {id: 9, lat: 14.696811993882754, lng: 121.08935561739372},
    {id: 10, lat: 14.695496, lng: 121.089083},
    {id:11, lat: 14.69663596066175, lng: 121.07586517833766},
    {id: 12, lat: 14.699274119599599, lng: 121.08432489798015}
];

function cluster(points){
    var i;
    var result = [];

    for(i = 0; i < points.length; i++){
        var cluster = newCluster(points[i], i);
        result.push(cluster);
    }

    for(i = 0; i < result.length; i++){
        var j;
        for(j = 0; j < result.length; j++){
            var length = Math.sqrt(Math.pow((result[j].lng - result[i].lng), 2) + Math.pow((result[j].lat - result[i].lat), 2));
            if(length < 0.0007){
                union(result[i], result[j]);
            }
        }
    }

    const clusterId = [... new Set(result.map(x => x.parent.rank))];
    
    for(i = 0; i <clusterId.length; i++){
        var clusterPoints = result.filter(function(point){
            return point.parent.rank == clusterId[i];
        });
        const newHull = convexHull(clusterPoints);
        drawHull(newHull);
    }

    drawPolygons();

    for(i = 0; i <result.length; i++){
        console.log("id:" + result[i].id + " rank:" + result[i].parent.rank);
    }
}

function newCluster(point, rankNum){
    var set = {
        rank: rankNum,
        id: point.id,
        lat: point.lat,
        lng: point.lng
    }
    set.parent = set;
    return set;
}

function find(point){
    if (point.parent !== point){
      point.parent = find(point.parent);
    }
    return point.parent;
}

function union(point1, point2){
    var root1 = find(point1);
    var root2 = find(point2);

    if(root1 !== root2){
        if(root1.rank < root2.rank){
            root1.parent = root2;
        } else {
            root2.parent = root1;
            if(root1.rank === root2.rank) root1.rank++;
        }
    }
}

function initMap() {
    map = new google.maps.Map(document.getElementById("map"), {
        center: myLatLng,
        zoom: myZoom,
        clickableIcons: false
    });

    cluster(patientLocations);

    var i;
    for(i = 0; i < patientLocations.length; i++){
        createMarker(patientLocations[i], patientLocations[i].id);
    }

}

function createMarker(position, id){
    const marker = new google.maps.Marker({
        position: position,
        draggable: true,
        map,
    });
    const markerLat = marker.getPosition().lat();
    const markerLng = marker.getPosition().lng();
    //insert code here to get full adress from lat lng
    const address = "address";

    const infowindow = new google.maps.InfoWindow({
        content: "id:" + String(id) + " lat: " + markerLat + " lng: " + markerLng + " address: " + address,
        //we can add more information here such as full address
    });
    marker.addListener("click", () => {
        if(removeMode){
            const position = patientLocations.findIndex(x => x.id == id);
            patientLocations.splice(position, 1);
            marker.setMap(null);
            removePolygons();
            cluster(patientLocations);
        }
        infowindow.open(marker.get("map"), marker);
    });
    google.maps.event.addListener(marker, 'dragend', function() {
        const position = patientLocations.findIndex(x => x.id == id);
        patientLocations[position].lat = marker.getPosition().lat();
        patientLocations[position].lng = marker.getPosition().lng(); 
        removePolygons();
        cluster(patientLocations);
    });
    counter++;
}

function drawHull(points) {
    var polygon = new google.maps.Polygon({
        paths: points,
        strokeColor: "#FF0000",
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: "#FF0000",
        fillOpacity: 0.35,
        clickable: false,
    });
    const area = google.maps.geometry.spherical.computeArea(polygon.getPath()); // pang compute ng area ng hull
    polygonArray.push(polygon);
}


function drawPolygons() {
    var i;
    for(i = 0; i < polygonArray.length; i++){
        polygonArray[i].setMap(map);
    }
}

function removePolygons() {
    var i;
    for(i = 0; i < polygonArray.length; i++){
        polygonArray[i].setMap(null);
    }
    polygonArray = [];
}


function isLeft(a, b, c){
    return result = ((b.lng - a.lng) * (c.lat - a.lat) - (b.lat - a.lat) * (c.lng - a.lng)) > 0;
}

function convexHull(coordinates){
    const points = coordinates;
    points.sort((a,b) => a.lng - b.lng);
    var start = points[0];
    var result = [];
    var i = 0;

    do {
        result[i] = start;
        var current = result[0];
        var j;
        for(j = 0; j < points.length; j++){
            var checkLeft = isLeft(result[i], current, points[j]);
            if((current == start) || checkLeft){
                current = points[j];
            }
        }
        start = current;
        i++;
    } while (current != result[0])
    return result;
}

function setArea(){
    myLatLng = map.getCenter(); 
    myZoom = map.getZoom();
    alert("Area Succesfully Changed");

    //add code to save  mylatlng to a storage
    //para pag niload ni user ang map ay maipapakita ang nakasave na location imbes na kung saan lang
}

function goToArea(){
    map.panTo(myLatLng);
    map.setZoom(myZoom);
}

function addMarker(){
    if(addMode){
        addMode = false;
        messageStyle.style.display = "none";
        google.maps.event.removeListener(addMarkerEvent);
        return;
    }
    addMode = true;
    removeMode = false;
    
    messageStyle.style.display = "block";
    messageStyle.innerHTML = "You are in Add Mode. Click 'Add' again to exit";
    addMarkerEvent = map.addListener("click", (mapsMouseEvent) =>{
        createMarker(mapsMouseEvent.latLng, counter+1);
        patientLocations.push({id: counter, lat: mapsMouseEvent.latLng.lat(), lng: mapsMouseEvent.latLng.lng()});
        removePolygons();
        cluster(patientLocations);
    });
}

function removeMarker(){
    if(removeMode){
        removeMode = false;
        messageStyle.style.display = "none";
        return;
    }
    removeMode = true;
    addMode = false;
    google.maps.event.removeListener(addMarkerEvent);

    messageStyle.style.display = "block";
    messageStyle.innerHTML = "You are in Remove Mode. Click 'Remove' again to exit";
}

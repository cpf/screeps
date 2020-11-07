class Builder {
    constructor(obj) {
        if (obj.type == "Creep") {
            this.creep = obj
        }

        if (obj.type == "Spawn") {
            this.spawn = obj
            var body = this.calculateBody()

            var creepName = 'B' + Game.time
            var err = this.spawn.spawnCreep(body.sort(), creepName, 
            {
                memory: {
                    role: 'B'
                }
            })

            if (err != OK) {
                console.log("B ERROR SPAWNING CREEP: " + err)
                return
            }

            var creep = Game.creeps[creepName]

            this.creep = creep

            this.selectBuildSite()
        }
    }

    run() {
        if (!this.creep.memory.target) {
            this.creep.suicide()
            return
        }

        if (this.creep.memory.building) {
            this.build()
        } else if (this.creep.memory.pickupTarget) {
            this.withdraw()
        } else {
            this.selectPickupTarget()
        }
    }

    build() {
        var target = Game.getObjectById(this.creep.memory.target)
        var err = this.creep.build(target)
        switch (err) {
            case ERR_NOT_IN_RANGE:
                this.creep.moveTo(target, {
                    visualizePathStyle: {
                        stroke: '#11ffcc'
                    }
                })
                break
            case ERR_INVALID_TARGET:
                console.log("builder invalid target")
                break
            case ERR_NO_BODYPART:
                console.log("builder no bodyparts")
                break
            case ERR_BUSY:
            case OK:
            default:
                break
        }

        if (this.creep.store.getUsedCapacity() == 0) {
            this.creep.memory.building = false
        }

        if (!Game.getObjectById(this.creep.memory.target)) {
            delete this.creep.memory.target
        }
    }

    withdraw() {
        var target = Game.getObjectById(this.creep.memory.pickupTarget)
        var err = this.creep.withdraw(target, RESOURCE_ENERGY)
        switch (err) {
            case ERR_NOT_IN_RANGE:
                this.creep.moveTo(target, {
                    visualizePathStyle: {
                        stroke: '#ffcccc'
                    }
                })
                break
            case ERR_INVALID_TARGET:
            case ERR_FULL:
            case ERR_INVALID_ARGS:
            case OK:
            default:
                delete this.creep.memory.pickupTarget
                break
        }

        if (this.creep.store.getFreeCapacity() == 0) {
            this.creep.memory.building = true
        }
    }

    selectPickupTarget() {
        var target = this.creep.pos.findClosestByPath(FIND_STRUCTURES, {
            filter: (structure) => (structure.structureType == STRUCTURE_EXTENSION || structure.structureType == STRUCTURE_SPAWN
                    ) && structure.store.getUsedCapacity(RESOURCE_ENERGY) > 0
        })

        if (target) {
            this.creep.memory.pickupTarget = target.id
        }
    }

    selectBuildSite() {
        if (!("reservedBuildSites" in Memory)) {
            Memory.reservedBuildSites = []
        }

        var targets = this.creep.room.find(FIND_MY_CONSTRUCTION_SITES, {
            filter: (site) => Memory.reservedBuildSites.indexOf(site.id) === -1
        })

        if (targets && targets.length > 0) {
            this.creep.memory.target = targets[0].id
            Memory.reservedBuildSites.push(targets[0].id)
        }
    }

    calculateBody() {
        var energyAvailable = this.spawn.room.energyAvailable
        var toAdd = [
            WORK,
            CARRY,
            MOVE,
            WORK,
            CARRY,
            MOVE,
            MOVE,
            MOVE,
            CARRY,
            WORK,
            CARRY,
            MOVE,
            MOVE,
            CARRY,
            MOVE,
            MOVE,
            CARRY,
            MOVE,
            CARRY,
            MOVE,
            MOVE
        ]
        var body = [ WORK, CARRY, MOVE ]

        var buildCost = 0
        for (var index in body) {
            buildCost += BODYPART_COST[body[index]]
        }

        for (index in toAdd) {
            var part = toAdd[index]
            if (buildCost + BODYPART_COST[part] <= energyAvailable) {
                body.push(part)
                buildCost += BODYPART_COST[part]
            } else {
                break
            }
        }

        return body
    }
}

module.exports = Builder
class Upgrader {
    constructor(obj) {
        if (obj.type == "Creep") {
            this.creep = obj
        }

        if (obj.type == "Spawn") {
            this.spawn = obj
            var body = this.calculateBody()

            var creepName = 'U' + Game.time
            var err = this.spawn.spawnCreep(body.sort(), creepName, 
            {
                memory: {
                    role: 'U'
                }
            })

            if (err != OK) {
                console.log("U ERROR SPAWNING CREEP: " + err)
                return
            }

            var creep = Game.creeps[creepName]

            this.creep = creep
        }
    }

    run() {
        if ("pauseTimer" in this.creep.memory && Game.time < this.creep.memory.pauseTimer) {
            return
        }

        if (this.creep.memory.upgrading) {
            this.upgrade()
        } else if (this.creep.memory.pickupTarget) {
            this.withdraw()
        } else {
            this.selectPickupTarget()
        }
    }

    upgrade() {
        var target = this.creep.room.controller
        if (!target) {
            console.log("Error: No controller!")
            return
        }

        var err = this.creep.upgradeController(target)
        switch (err) {
            case ERR_NOT_IN_RANGE:
                this.creep.moveTo(target, {
                    visualizePathStyle: {
                        stroke: '#ffc9c9'
                    }
                })
                break
            case ERR_INVALID_TARGET:
            case ERR_NO_BODYPART:
            case ERR_NOT_ENOUGH_RESOURCES:
                this.creep.memory.upgrading = false
                break
            default:
                break
        }

        if (this.creep.store.getUsedCapacity() == 0) {
            this.creep.memory.upgrading = false
        }
    }

    withdraw() {
        let target = Game.getObjectById(this.creep.memory.pickupTarget)
        if (this.creep.room.energyAvailable < 200) { // 200 is the minimum for making something useful, we don't want to be in the way for that
            this.pause()
            return
        }

        var err = this.creep.withdraw(target, RESOURCE_ENERGY)
        switch (err) {
            case ERR_NOT_IN_RANGE:
                this.creep.moveTo(target, {
                    visualizePathStyle: {
                        stroke: '#c9c9c9'
                    }
                })
                break
            case ERR_NOT_ENOUGH_RESOURCES:
                this.pause()
                break
            case ERR_INVALID_TARGET:
            case ERR_FULL:
            case ERR_INVALID_ARGS:
            case OK:
                this.resetPause()
            default:
                delete this.creep.memory.pickupTarget
                break
        }

        if (this.creep.store.getFreeCapacity() == 0) {
            this.creep.memory.upgrading = true
        }
    }

    resetPause() {
        delete this.creep.memory.pauseTimer
        delete this.creep.memory.pauseCounter
    }

    pause() {
        if (!"pauseTimer" in this.creep.memory) {
            this.creep.memory.pauseTimer = Game.time + 10
            this.creep.memory.pauseCounter = 1
        } else {
            this.creep.memory.pauseCounter += 1
            this.creep.memory.pauseTimer = Game.time + (10 * this.creep.memory.pauseCounter)

            if (this.creep.memory.pauseCounter >= 10) {
                this.creep.memory.pauseCounter = 1
            }
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

    calculateBody() {
        var energyAvailable = this.spawn.room.energyAvailable
        var toAdd = [
            MOVE,
            CARRY,
            CARRY,
            CARRY,
            MOVE,
            WORK,
            CARRY,
            CARRY,
            WORK,
            CARRY,
            CARRY,
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

module.exports = Upgrader
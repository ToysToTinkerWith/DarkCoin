from pyteal import *


def approval_program():

    @Subroutine(TealType.bytes)
    def itoa(i):
        """itoa converts an integer to the ascii byte string it represents"""
        return If(
            i == Int(0),
            Bytes("0"),
            Concat(
                If(i / Int(10) > Int(0), itoa(i / Int(10)), Bytes("")),
                int_to_ascii(i % Int(10)),
            ),
        )

    @Subroutine(TealType.bytes)
    def int_to_ascii(arg):
        """int_to_ascii converts an integer to the ascii byte that represents it"""
        return Extract(Bytes("0123456789"), arg, Int(1))
    
    handle_creation = Return(
        Seq(
            App.globalPut(Bytes("Address"), Global.current_application_address()),
            App.globalPut(Bytes("battleNum"), Int(1)),
            Int(1)
        )
    )
    
    

    fight = Seq(
        Assert(Gtxn[0].xfer_asset() == Int(1088771340)),
        Assert(Gtxn[0].asset_amount() == App.globalGet(Txn.application_args[1])),
        Assert(Gtxn[0].asset_receiver() == Global.current_application_address()),
        If(
            Mod(Block.timestamp(Minus(Txn.first_valid(), Int(1))), Int(2)),
            Seq(
                InnerTxnBuilder.Begin(),
                InnerTxnBuilder.SetFields({
                    TxnField.type_enum: TxnType.AssetTransfer,
                    TxnField.xfer_asset: Txn.assets[0],
                    TxnField.asset_receiver: Txn.accounts[1],
                    TxnField.asset_amount: Mul(App.globalGet(Txn.application_args[1]), Int(2)),
                }),
                InnerTxnBuilder.Submit(),
                App.box_put(Txn.application_args[2], Txn.application_args[4]),
                App.globalDel(Txn.application_args[1]),
                App.globalPut(Bytes("battleNum"), Add(App.globalGet(Bytes("battleNum")), Int(1)))
            ),
            Seq(
                InnerTxnBuilder.Begin(),
                InnerTxnBuilder.SetFields({
                    TxnField.type_enum: TxnType.AssetTransfer,
                    TxnField.xfer_asset: Txn.assets[0],
                    TxnField.asset_receiver: Txn.accounts[0],
                    TxnField.asset_amount:  Mul(App.globalGet(Txn.application_args[1]), Int(2)),
                }),
                InnerTxnBuilder.Submit(),
                App.box_put(Txn.application_args[2], Txn.application_args[3]),
                App.globalDel(Txn.application_args[1]),
                App.globalPut(Bytes("battleNum"), Add(App.globalGet(Bytes("battleNum")), Int(1)))

            )
        ),
        Int(1)
       


    )

    start = Seq(
        Assert(Gtxn[0].xfer_asset() == Int(1088771340)),
        Assert(Gtxn[0].asset_amount() >= Int(10000000000)),
        Assert(Gtxn[0].asset_receiver() == Global.current_application_address()),
        Assert(Gtxn[1].amount() == Int(500000)),
        Assert(Gtxn[1].receiver() == Global.current_application_address()),
        App.globalPut(Txn.application_args[1], Gtxn[0].asset_amount()),
        Int(1)

    )

   
    # doesn't need anyone to opt in
    handle_optin = Return(
        Seq(
            senderAssetBalance := AssetHolding.balance(Txn.sender(), Txn.assets[0]),
            Assert(senderAssetBalance.value() == Int(1)),
            unitName := AssetParam.unitName(Txn.assets[0]),
            Assert(Substring(unitName.value(), Int(0), Int(6)) == Bytes("DCCHAR")),
            App.localPut(Txn.sender(), Bytes("assetId"), Txn.assets[0]),
            App.localPut(Txn.sender(), Bytes("name"), Txn.application_args[0]),
            Int(1)
        )
    )

    select = Seq(
            senderAssetBalance := AssetHolding.balance(Txn.sender(), Txn.assets[0]),
            Assert(senderAssetBalance.value() == Int(1)),
            unitName := AssetParam.unitName(Txn.assets[0]),
            Assert(Substring(unitName.value(), Int(0), Int(6)) == Bytes("DCCHAR")),
            App.localPut(Txn.sender(), Bytes("assetId"), Txn.assets[0]),
            App.localPut(Txn.sender(), Bytes("name"), Txn.application_args[1]),
            Int(1)
    )

    reward = Seq(
        Assert(Txn.sender() == Addr("YRVK422KP65SU4TBAHY34R7YT3OYFOL4DUSFR4UADQEQHS2HMXKORIC6TE")),
        Assert(App.globalGet(Bytes("battleNum")) >= App.globalGet(Bytes("rewardBattle"))),
        App.globalPut(Bytes("rewardBattle"), Add(App.globalGet(Bytes("rewardBattle")), Int(100))),
        Int(1)
    )

    update = Seq(
        Assert(Txn.sender() == Addr("YRVK422KP65SU4TBAHY34R7YT3OYFOL4DUSFR4UADQEQHS2HMXKORIC6TE")),
        Assert(App.globalGet(Bytes("battleNum")) >= App.globalGet(Bytes("updateBattle"))),
        App.globalPut(Bytes("updateBattle"), Add(App.globalGet(Bytes("updateBattle")), Int(10))),
        Int(1)
    )

    globaldel = Seq(
        Assert(Txn.sender() == Addr("NSPLIQLVYV7US34UDYGYPZD7QGSHWND7AWSWPD4FTLRGW5IF2P2R3IF3EQ")),
        App.globalDel(Txn.application_args[1]),
        Int(1)

    )

    globaladd = Seq(
        Assert(Txn.sender() == Addr("NSPLIQLVYV7US34UDYGYPZD7QGSHWND7AWSWPD4FTLRGW5IF2P2R3IF3EQ")),
        App.globalPut(Bytes("updateBattle"), Int(90)),
        Int(1)

    )
    

    # only the creator can closeout the contract
    handle_closeout = Return(Int(1))

    # nobody can update the contract
    handle_updateapp =  Return(Txn.sender() == Global.creator_address())

    # only creator can delete the contract
    handle_deleteapp = Return(Txn.sender() == Global.creator_address())

    opt_in = Seq(
        Assert(Txn.sender() == Addr("NSPLIQLVYV7US34UDYGYPZD7QGSHWND7AWSWPD4FTLRGW5IF2P2R3IF3EQ")),
        InnerTxnBuilder.Begin(),
        InnerTxnBuilder.SetFields({
            TxnField.type_enum: TxnType.AssetTransfer,
            TxnField.xfer_asset: Txn.assets[0],
            TxnField.asset_receiver: Global.current_application_address(),
            TxnField.asset_amount: Int(0),
        }),
        InnerTxnBuilder.Submit(),
         Int(1)
    )


    # handle the types of application calls
    program = Cond(
        [Txn.application_id() == Int(0), handle_creation],
        [Txn.on_completion() == OnComplete.OptIn, handle_optin],
        [Txn.on_completion() == OnComplete.CloseOut, handle_closeout],
        [Txn.on_completion() == OnComplete.UpdateApplication, handle_updateapp],
        [Txn.on_completion() == OnComplete.DeleteApplication, handle_deleteapp],
        [Txn.application_args[0] == Bytes("optin"), Return(opt_in)],
        [Txn.application_args[0] == Bytes("select"), Return(select)],
        [Txn.application_args[0] == Bytes("start"), Return(start)],
        [Txn.application_args[0] == Bytes("fight"), Return(fight)],
        [Txn.application_args[0] == Bytes("reward"), Return(reward)],
        [Txn.application_args[0] == Bytes("update"), Return(update)],
        [Txn.application_args[0] == Bytes("globaldel"), Return(globaldel)],
        [Txn.application_args[0] == Bytes("globaladd"), Return(globaladd)]


       

    )
    
    return program

# let clear state happen
def clear_state_program():
    program = Return(Int(1))
    return program
    


if __name__ == "__main__":
    with open("vote_approval.teal", "w") as f:
        compiled = compileTeal(approval_program(), mode=Mode.Application, version=8)
        f.write(compiled)

    with open("vote_clear_state.teal", "w") as f:
        compiled = compileTeal(clear_state_program(), mode=Mode.Application, version=8)
        f.write(compiled)
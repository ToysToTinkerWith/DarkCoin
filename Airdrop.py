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
    
    i = ScratchVar(TealType.uint64)


    handle_creation = Return(
        Int(1)
    )
    

    send = Seq(
        Assert(Txn.sender() == Addr("YRVK422KP65SU4TBAHY34R7YT3OYFOL4DUSFR4UADQEQHS2HMXKORIC6TE")),
        For(i.store(Int(2)), i.load() < Add(Txn.accounts.length(), Int(1)), i.store(i.load() + Int(1))).Do(Seq(
            holderBasedBalance := AssetHolding.balance(Txn.accounts[i.load()], Txn.assets[1]),
            holderSendingBalance := AssetHolding.balance(Txn.accounts[i.load()], Txn.assets[0]),
            Assert(Ge(App.localGet(Txn.accounts[1], Itob(Txn.assets[0])), Btoi(Txn.application_args[i.load()]))),
            If(And(holderBasedBalance.value(), holderSendingBalance.hasValue()),
               Seq(
                InnerTxnBuilder.Begin(),
                InnerTxnBuilder.SetFields({
                    TxnField.type_enum: TxnType.AssetTransfer,
                    TxnField.xfer_asset: Txn.assets[0],
                    TxnField.asset_receiver: Txn.accounts[i.load()],
                    TxnField.asset_amount: Btoi(Txn.application_args[i.load()]),
                    TxnField.note: Txn.application_args[1],

                }),
                InnerTxnBuilder.Submit(),
                App.localPut(Txn.accounts[1], Itob(Txn.assets[0]), Minus(App.localGet(Txn.accounts[1], Itob(Txn.assets[0])), Btoi(Txn.application_args[i.load()])))
               ))
            
            
        )),
        Int(1)
    )

    sendNoti = Seq(
        Assert(Txn.sender() == Addr("YRVK422KP65SU4TBAHY34R7YT3OYFOL4DUSFR4UADQEQHS2HMXKORIC6TE")),
        holderBasedBalance := AssetHolding.balance(Txn.accounts[2], Txn.assets[1]),
        holderSendingBalance := AssetHolding.balance(Txn.accounts[2], Txn.assets[0]),
        Assert(Gtxn[Add(Txn.group_index(), Int(1))].asset_amount() == Btoi(Txn.application_args[2])),
        Assert(Gtxn[Add(Txn.group_index(), Int(1))].xfer_asset() == Txn.assets[0]),
        Assert(Gtxn[Add(Txn.group_index(), Int(1))].asset_receiver() == Txn.accounts[2]),
        InnerTxnBuilder.Begin(),
        InnerTxnBuilder.SetFields({
            TxnField.type_enum: TxnType.AssetTransfer,
            TxnField.xfer_asset: Txn.assets[0],
            TxnField.asset_receiver: Txn.sender(),
            TxnField.asset_amount: Btoi(Txn.application_args[2]),
            TxnField.note: Txn.application_args[1],

        }),
        InnerTxnBuilder.Submit(),
        App.localPut(Txn.accounts[1], Itob(Txn.assets[0]), Minus(App.localGet(Txn.accounts[1], Itob(Txn.assets[0])), Btoi(Txn.application_args[2]))),
        Int(1)
    )

    load = Seq(
        Assert(Gtxn[Minus(Txn.group_index(), Int(1))].asset_amount()),
        Assert(Gtxn[Minus(Txn.group_index(), Int(1))].xfer_asset() == Txn.assets[0]),
        Assert(Gtxn[Minus(Txn.group_index(), Int(1))].asset_receiver() == Global.current_application_address()),
        If(App.localGet(Txn.sender(), Itob(Txn.assets[0])), 
        App.localPut(Txn.sender(), Itob(Txn.assets[0]), Add(Gtxn[Minus(Txn.group_index(), Int(1))].asset_amount(), App.localGet(Txn.sender(), Itob(Txn.assets[0])))),
        App.localPut(Txn.sender(), Itob(Txn.assets[0]), Gtxn[Minus(Txn.group_index(), Int(1))].asset_amount())
        ),
        Int(1)
    )


   
    # doesn't need anyone to opt in
    handle_optin = Return(
        Int(1)
    )
    

    # only the creator can closeout the contract
    handle_closeout = Return(Int(1))

    # nobody can update the contract
    handle_updateapp =  Return(Txn.sender() == Global.creator_address())

    # only creator can delete the contract
    handle_deleteapp = Return(Txn.sender() == Global.creator_address())

    opt_in = Seq(
        Assert(Gtxn[Minus(Txn.group_index(), Int(1))].amount() == Int(100000)),
        Assert(Gtxn[Minus(Txn.group_index(), Int(1))].receiver() == Global.current_application_address()),
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
        [Txn.application_args[0] == Bytes("send"), Return(send)],
        [Txn.application_args[0] == Bytes("sendNoti"), Return(sendNoti)],
        [Txn.application_args[0] == Bytes("load"), Return(load)],
        [Txn.application_args[0] == Bytes("optin"), Return(opt_in)]

        


       

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